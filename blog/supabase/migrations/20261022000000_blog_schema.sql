-- ═══════════════════════════════════════════════════════════════════════════
-- Blog: profiles, roles, posts registry, comments, likes, reports, views.
--
-- Security model, in one paragraph: the browser talks to Supabase directly
-- with the public "publishable"/anon key, so every rule lives here. Tables
-- have RLS on; writes a normal user may make are narrowed further with
-- column-level grants, and anything privileged (moderation, bans, syncing the
-- post registry, deleting an account) goes through SECURITY DEFINER functions
-- that check is_admin() / auth.uid() themselves. Nothing trusts a user id or a
-- role sent by the client — author ids come from auth.uid().
--
-- Articles themselves are Markdown files in git (blog/src/content/posts). The
-- `posts` table is only a registry so comments and likes have something to
-- reference; the admin dashboard syncs it from the built site.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Roles ────────────────────────────────────────────────────────────────

create table public.user_roles (
    user_id    uuid primary key references auth.users (id) on delete cascade,
    role       text not null check (role in ('admin')),
    granted_at timestamptz not null default now()
);

-- Granted only from the SQL editor / service role. See README "First admin".
alter table public.user_roles enable row level security;
revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;
create policy "read own role" on public.user_roles
    for select to authenticated using (user_id = (select auth.uid()));

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
    select exists (
        select 1 from public.user_roles
        where user_id = (select auth.uid()) and role = 'admin'
    );
$$;

-- ── Moderation state (kept out of the public profile row) ────────────────

create table public.user_moderation (
    user_id    uuid primary key references auth.users (id) on delete cascade,
    banned_at  timestamptz,
    ban_reason text check (char_length(ban_reason) <= 300),
    banned_by  uuid references auth.users (id) on delete set null,
    updated_at timestamptz not null default now()
);
alter table public.user_moderation enable row level security;
revoke all on public.user_moderation from anon, authenticated;
grant select on public.user_moderation to authenticated;
create policy "admins read moderation" on public.user_moderation
    for select to authenticated using ((select public.is_admin()));
create policy "read own moderation" on public.user_moderation
    for select to authenticated using (user_id = (select auth.uid()));

-- Signed in and not banned: the bar for commenting, liking and reporting.
create function public.can_participate()
returns boolean
language sql stable security definer set search_path = ''
as $$
    select (select auth.uid()) is not null
       and not exists (
           select 1 from public.user_moderation
           where user_id = (select auth.uid()) and banned_at is not null
       );
$$;

-- ── Profiles ─────────────────────────────────────────────────────────────

create table public.profiles (
    id                  uuid primary key references auth.users (id) on delete cascade,
    -- Lowercase by construction, so uniqueness is case-insensitive for free.
    username            text not null unique
                        check (username ~ '^[a-z0-9_]{3,24}$'),
    display_name        text not null
                        check (char_length(btrim(display_name)) between 1 and 50),
    bio                 text not null default '' check (char_length(bio) <= 280),
    -- An object in the `avatars` bucket, always inside the owner's own folder.
    avatar_path         text check (
                            avatar_path is null
                            or (avatar_path like id::text || '/%' and char_length(avatar_path) <= 200)
                        ),
    -- Copied from the OAuth provider at sign-up; never writable by the user,
    -- and only from hosts the site's CSP allows.
    provider_avatar_url text check (
                            provider_avatar_url is null
                            or provider_avatar_url ~ '^https://(avatars\.githubusercontent\.com|lh[0-9]\.googleusercontent\.com)/'
                        ),
    username_changed_at timestamptz,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
-- Every column here is public by design: no email, no tokens, no moderation.
grant select on public.profiles to anon, authenticated;
grant update (username, display_name, bio, avatar_path) on public.profiles to authenticated;

create policy "profiles are public" on public.profiles
    for select to anon, authenticated using (true);
create policy "edit own profile" on public.profiles
    for update to authenticated
    using (id = (select auth.uid()) and (select public.can_participate()))
    with check (id = (select auth.uid()));

create function public.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
    for each row execute function public.touch_updated_at();

-- Username policy: the generated one can be replaced any time; after that,
-- once every 30 days, so a name can't be swapped out from under a thread.
create function public.enforce_username_policy()
returns trigger language plpgsql set search_path = ''
as $$
begin
    if new.username is distinct from old.username then
        if old.username_changed_at is not null
           and old.username_changed_at > now() - interval '30 days' then
            raise exception 'USERNAME_COOLDOWN: usernames can be changed once every 30 days'
                using errcode = 'P0001';
        end if;
        new.username_changed_at := now();
    end if;
    return new;
end;
$$;

create trigger profiles_username_policy before update of username on public.profiles
    for each row execute function public.enforce_username_policy();

-- Profile row for every new account. Username is derived from the provider's
-- handle or the email's local part, de-duplicated with a numeric suffix.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
    meta     jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
    base     text;
    candidate text;
    n        int := 0;
    avatar   text := coalesce(meta ->> 'avatar_url', meta ->> 'picture');
    display  text;
begin
    base := lower(regexp_replace(
        coalesce(meta ->> 'user_name', meta ->> 'preferred_username',
                 split_part(coalesce(new.email, ''), '@', 1), ''),
        '[^a-zA-Z0-9_]', '', 'g'));
    base := left(base, 20);
    if char_length(base) < 3 then
        base := 'reader';
    end if;

    candidate := base;
    while exists (select 1 from public.profiles where username = candidate) loop
        n := n + 1;
        candidate := left(base, 20) || n::text;
    end loop;

    display := left(btrim(coalesce(meta ->> 'full_name', meta ->> 'name',
                                   meta ->> 'user_name', candidate)), 50);
    if display = '' then
        display := candidate;
    end if;

    if avatar is not null
       and avatar !~ '^https://(avatars\.githubusercontent\.com|lh[0-9]\.googleusercontent\.com)/' then
        avatar := null;
    end if;

    insert into public.profiles (id, username, display_name, provider_avatar_url)
    values (new.id, candidate, display, left(avatar, 500));
    return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
    for each row execute function public.handle_new_user();

-- ── Posts registry ───────────────────────────────────────────────────────

create table public.posts (
    id              uuid primary key default gen_random_uuid(),
    slug            text not null unique
                    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
    title           text not null check (char_length(title) between 1 and 300),
    -- false once a post is removed from the site: its comments stop showing.
    published       boolean not null default true,
    comments_locked boolean not null default false,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

alter table public.posts enable row level security;
revoke all on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;   -- policies limit to admins

create policy "published posts are public" on public.posts
    for select to anon, authenticated using (published or (select public.is_admin()));
create policy "admins insert posts" on public.posts
    for insert to authenticated with check ((select public.is_admin()));
create policy "admins update posts" on public.posts
    for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete posts" on public.posts
    for delete to authenticated using ((select public.is_admin()));

create trigger posts_touch before update on public.posts
    for each row execute function public.touch_updated_at();

-- Called by the admin dashboard with the list of posts in the current build.
-- New slugs are registered, existing ones re-published and retitled, and any
-- registered post no longer in the build is unpublished (never deleted, so
-- its discussion survives a temporary removal).
create function public.sync_posts(p_posts jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
    added int; updated int; unpublished int;
begin
    if not public.is_admin() then
        raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    if jsonb_typeof(p_posts) <> 'array' or jsonb_array_length(p_posts) > 2000 then
        raise exception 'INVALID_INPUT' using errcode = '22023';
    end if;

    with incoming as (
        select distinct on (e ->> 'slug') e ->> 'slug' as slug, e ->> 'title' as title
        from jsonb_array_elements(p_posts) e
    ), ins as (
        insert into public.posts (slug, title)
        select i.slug, i.title from incoming i
        where not exists (select 1 from public.posts p where p.slug = i.slug)
        returning 1
    ) select count(*) into added from ins;

    with incoming as (
        select distinct on (e ->> 'slug') e ->> 'slug' as slug, e ->> 'title' as title
        from jsonb_array_elements(p_posts) e
    ), upd as (
        update public.posts p set title = i.title, published = true
        from incoming i
        where p.slug = i.slug and (p.title is distinct from i.title or not p.published)
        returning 1
    ) select count(*) into updated from upd;

    with unp as (
        update public.posts p set published = false
        where p.published
          and not exists (select 1 from jsonb_array_elements(p_posts) e where e ->> 'slug' = p.slug)
        returning 1
    ) select count(*) into unpublished from unp;

    return jsonb_build_object('added', added, 'updated', updated, 'unpublished', unpublished);
end;
$$;

-- ── Comments ─────────────────────────────────────────────────────────────

create table public.comments (
    id         uuid primary key default gen_random_uuid(),
    post_id    uuid not null references public.posts (id) on delete cascade,
    -- null once the author's account is deleted (the comment is scrubbed first).
    author_id  uuid references public.profiles (id) on delete set null default auth.uid(),
    -- Hard deletes only happen when a comment has no replies (or an admin
    -- removes a whole thread), so cascading here is the intended behavior.
    parent_id  uuid references public.comments (id) on delete cascade,
    depth      smallint not null default 0 check (depth between 0 and 2),
    body       text not null,
    status     text not null default 'visible' check (status in ('visible', 'hidden')),
    created_at timestamptz not null default now(),
    edited_at  timestamptz,
    deleted_at timestamptz,
    constraint comment_body_length check (
        deleted_at is not null or char_length(btrim(body)) between 1 and 4000
    )
);

create index comments_post_created on public.comments (post_id, created_at);
create index comments_parent on public.comments (parent_id);
create index comments_author_created on public.comments (author_id, created_at desc);
create index comments_status_created on public.comments (status, created_at desc);

alter table public.comments enable row level security;
revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
-- The only columns a user ever writes. Everything else is set by triggers.
grant insert (post_id, parent_id, body) on public.comments to authenticated;
grant update (body) on public.comments to authenticated;

create policy "read visible comments on published posts" on public.comments
    for select to anon, authenticated using (
        (status = 'visible' and deleted_at is null
            and exists (select 1 from public.posts p where p.id = post_id and p.published))
        or author_id = (select auth.uid())
        or (select public.is_admin())
    );

create policy "comment as yourself" on public.comments
    for insert to authenticated with check (
        author_id = (select auth.uid())
        and (select public.can_participate())
        and exists (select 1 from public.posts p
                    where p.id = post_id and p.published and not p.comments_locked)
    );

create policy "edit own live comment" on public.comments
    for update to authenticated
    using (author_id = (select auth.uid()) and deleted_at is null and status = 'visible'
           and (select public.can_participate()))
    with check (author_id = (select auth.uid()));

-- Insert guard: forces the author, computes depth, keeps replies on the same
-- post, and rate-limits. Runs as definer so the counts see every row.
create function public.comments_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
    parent public.comments%rowtype;
    recent int;
begin
    new.author_id  := auth.uid();
    new.status     := 'visible';
    new.created_at := now();
    new.edited_at  := null;
    new.deleted_at := null;
    new.body       := btrim(new.body);

    if new.parent_id is not null then
        select * into parent from public.comments where id = new.parent_id;
        if not found or parent.post_id <> new.post_id then
            raise exception 'INVALID_PARENT: reply target not found' using errcode = 'P0001';
        end if;
        if parent.deleted_at is not null or parent.status <> 'visible' then
            raise exception 'INVALID_PARENT: that comment is no longer available' using errcode = 'P0001';
        end if;
        if parent.depth >= 2 then
            raise exception 'TOO_DEEP: replies nest at most three levels' using errcode = 'P0001';
        end if;
        new.depth := parent.depth + 1;
    else
        new.depth := 0;
    end if;

    -- Anti-spam: 3 a minute, 30 a day, and no identical repeats within an hour.
    select count(*) into recent from public.comments
        where author_id = new.author_id and created_at > now() - interval '1 minute';
    if recent >= 3 then
        raise exception 'RATE_LIMITED: slow down — try again in a minute' using errcode = 'P0001';
    end if;
    select count(*) into recent from public.comments
        where author_id = new.author_id and created_at > now() - interval '1 day';
    if recent >= 30 then
        raise exception 'RATE_LIMITED: daily comment limit reached' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.comments
               where author_id = new.author_id and body = new.body
                 and created_at > now() - interval '1 hour') then
        raise exception 'DUPLICATE: you already posted that' using errcode = 'P0001';
    end if;

    return new;
end;
$$;

create trigger comments_insert_guard before insert on public.comments
    for each row execute function public.comments_before_insert();

create function public.comments_before_update()
returns trigger language plpgsql set search_path = ''
as $$
begin
    new.body := btrim(new.body);
    if new.body is distinct from old.body then
        new.edited_at := now();
    end if;
    return new;
end;
$$;

create trigger comments_update_guard before update of body on public.comments
    for each row execute function public.comments_before_update();

-- Delete your own comment (or any, as admin). With replies it is scrubbed to
-- a "[deleted]" placeholder so the thread below it still reads; without, it
-- is removed outright.
create function public.delete_comment(p_comment_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
    c public.comments%rowtype;
begin
    select * into c from public.comments where id = p_comment_id;
    if not found then
        raise exception 'NOT_FOUND' using errcode = 'P0002';
    end if;
    if c.author_id is distinct from auth.uid() and not public.is_admin() then
        raise exception 'FORBIDDEN' using errcode = '42501';
    end if;

    if exists (select 1 from public.comments where parent_id = c.id) then
        update public.comments set body = '', deleted_at = now() where id = c.id;
    else
        delete from public.comments where id = c.id;
    end if;
end;
$$;

-- ── Likes ────────────────────────────────────────────────────────────────

create table public.post_likes (
    post_id    uuid not null references public.posts (id) on delete cascade,
    user_id    uuid not null references public.profiles (id) on delete cascade default auth.uid(),
    created_at timestamptz not null default now(),
    primary key (post_id, user_id)
);
create index post_likes_user on public.post_likes (user_id);

create table public.comment_likes (
    comment_id uuid not null references public.comments (id) on delete cascade,
    user_id    uuid not null references public.profiles (id) on delete cascade default auth.uid(),
    created_at timestamptz not null default now(),
    primary key (comment_id, user_id)
);
create index comment_likes_user on public.comment_likes (user_id);

alter table public.post_likes enable row level security;
alter table public.comment_likes enable row level security;
revoke all on public.post_likes, public.comment_likes from anon, authenticated;
-- Who liked what stays private; counts come from post_like_count() and
-- get_post_comments().
grant select, delete on public.post_likes, public.comment_likes to authenticated;
grant insert (post_id) on public.post_likes to authenticated;
grant insert (comment_id) on public.comment_likes to authenticated;

create policy "see own post likes" on public.post_likes
    for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "like published posts" on public.post_likes
    for insert to authenticated with check (
        user_id = (select auth.uid()) and (select public.can_participate())
        and exists (select 1 from public.posts p where p.id = post_id and p.published)
    );
create policy "unlike own" on public.post_likes
    for delete to authenticated using (user_id = (select auth.uid()));

create policy "see own comment likes" on public.comment_likes
    for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "like visible comments" on public.comment_likes
    for insert to authenticated with check (
        user_id = (select auth.uid()) and (select public.can_participate())
        and exists (select 1 from public.comments c join public.posts p on p.id = c.post_id
                    where c.id = comment_id and c.status = 'visible'
                      and c.deleted_at is null and p.published)
    );
create policy "unlike own comment" on public.comment_likes
    for delete to authenticated using (user_id = (select auth.uid()));

create function public.force_like_owner()
returns trigger language plpgsql set search_path = ''
as $$
begin
    new.user_id := auth.uid();
    new.created_at := now();
    return new;
end;
$$;
create trigger post_likes_owner before insert on public.post_likes
    for each row execute function public.force_like_owner();
create trigger comment_likes_owner before insert on public.comment_likes
    for each row execute function public.force_like_owner();

-- ── Reports ──────────────────────────────────────────────────────────────

create table public.comment_reports (
    id          uuid primary key default gen_random_uuid(),
    comment_id  uuid not null references public.comments (id) on delete cascade,
    reporter_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
    reason      text not null check (reason in ('spam', 'harassment', 'off-topic', 'other')),
    details     text not null default '' check (char_length(details) <= 500),
    created_at  timestamptz not null default now(),
    resolved_at timestamptz,
    resolved_by uuid references auth.users (id) on delete set null,
    unique (comment_id, reporter_id)
);
create index comment_reports_open on public.comment_reports (created_at desc) where resolved_at is null;

alter table public.comment_reports enable row level security;
revoke all on public.comment_reports from anon, authenticated;
grant select on public.comment_reports to authenticated;
grant insert (comment_id, reason, details) on public.comment_reports to authenticated;

create policy "admins and reporters read reports" on public.comment_reports
    for select to authenticated using (
        reporter_id = (select auth.uid()) or (select public.is_admin())
    );
create policy "report others' visible comments" on public.comment_reports
    for insert to authenticated with check (
        reporter_id = (select auth.uid()) and (select public.can_participate())
    );

-- Forces the reporter, blocks self-reports, caps volume, and hides a comment
-- automatically at three open reports (an admin can restore it).
create function public.reports_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
    target public.comments%rowtype;
begin
    new.reporter_id := auth.uid();
    new.created_at  := now();
    new.resolved_at := null;
    new.resolved_by := null;

    select * into target from public.comments where id = new.comment_id;
    if not found or target.deleted_at is not null or target.status <> 'visible' then
        raise exception 'NOT_FOUND' using errcode = 'P0002';
    end if;
    if target.author_id = new.reporter_id then
        raise exception 'INVALID: you cannot report your own comment' using errcode = 'P0001';
    end if;
    if (select count(*) from public.comment_reports
        where reporter_id = new.reporter_id and created_at > now() - interval '1 day') >= 20 then
        raise exception 'RATE_LIMITED: report limit reached for today' using errcode = 'P0001';
    end if;
    return new;
end;
$$;

create trigger reports_insert_guard before insert on public.comment_reports
    for each row execute function public.reports_before_insert();

create function public.reports_after_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
    if (select count(*) from public.comment_reports
        where comment_id = new.comment_id and resolved_at is null) >= 3 then
        update public.comments set status = 'hidden' where id = new.comment_id;
    end if;
    return null;
end;
$$;

create trigger reports_auto_hide after insert on public.comment_reports
    for each row execute function public.reports_after_insert();

-- ── Page views (basic analytics) ─────────────────────────────────────────

create table public.post_views_daily (
    post_id uuid not null references public.posts (id) on delete cascade,
    day     date not null default current_date,
    views   integer not null default 0 check (views >= 0),
    primary key (post_id, day)
);

alter table public.post_views_daily enable row level security;
revoke all on public.post_views_daily from anon, authenticated;
grant select on public.post_views_daily to authenticated;
create policy "admins read views" on public.post_views_daily
    for select to authenticated using ((select public.is_admin()));

-- Anyone may call this; the page de-duplicates per browser per day. It is a
-- rough count by design — it can be inflated, never used for anything else.
create function public.record_view(p_slug text)
returns void
language sql security definer set search_path = ''
as $$
    insert into public.post_views_daily (post_id, day, views)
    select id, current_date, 1 from public.posts where slug = p_slug and published
    on conflict (post_id, day) do update set views = public.post_views_daily.views + 1;
$$;

-- ── Public read functions ────────────────────────────────────────────────

create function public.post_like_count(p_post_id uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
    select count(*)::int from public.post_likes l
    join public.posts p on p.id = l.post_id
    where l.post_id = p_post_id and p.published;
$$;

-- One page of top-level comments (keyset-paged on created_at, id) plus every reply under them, with author
-- info and like counts. Removed comments (hidden or deleted) come back only
-- if they still have visible replies, and then with their body and author
-- blanked, so a thread never shows a hole but never leaks removed text.
create function public.get_post_comments(
    p_post_id uuid,
    p_after    timestamptz default null,
    p_after_id uuid default null,
    p_limit    integer default 20
)
returns table (
    id                  uuid,
    parent_id           uuid,
    depth               smallint,
    body                text,
    is_removed          boolean,
    created_at          timestamptz,
    edited_at           timestamptz,
    author_id           uuid,
    username            text,
    display_name        text,
    avatar_path         text,
    provider_avatar_url text,
    like_count          integer,
    liked_by_me         boolean
)
language sql stable security definer set search_path = ''
as $$
    with recursive
    post as (
        select p.id from public.posts p where p.id = p_post_id and p.published
    ),
    live as (
        select c.* from public.comments c
        where c.post_id = (select id from post)
          and c.status = 'visible' and c.deleted_at is null
    ),
    -- A removed comment is kept when any live comment sits below it.
    keep_removed as (
        select c.id, c.parent_id from public.comments c
        where c.post_id = (select id from post)
          and (c.status <> 'visible' or c.deleted_at is not null)
          and exists (
              with recursive below as (
                  select x.id, x.status, x.deleted_at from public.comments x where x.parent_id = c.id
                  union all
                  select y.id, y.status, y.deleted_at from public.comments y join below b on y.parent_id = b.id
              )
              select 1 from below where status = 'visible' and deleted_at is null
          )
    ),
    shown as (
        select c.* from public.comments c
        where c.id in (select id from live union select id from keep_removed)
    ),
    roots as (
        select s.id, s.created_at from shown s
        where s.parent_id is null
          and (p_after is null or (s.created_at, s.id) > (p_after, coalesce(p_after_id, '00000000-0000-0000-0000-000000000000'::uuid)))
        order by s.created_at, s.id
        limit least(greatest(coalesce(p_limit, 20), 1), 100)
    ),
    tree as (
        select s.* from shown s where s.id in (select id from roots)
        union all
        select s.* from shown s join tree t on s.parent_id = t.id
    )
    select
        t.id, t.parent_id, t.depth,
        case when removed then null else t.body end,
        removed,
        t.created_at,
        case when removed then null else t.edited_at end,
        case when removed then null else t.author_id end,
        case when removed then null else pr.username end,
        case when removed then null else pr.display_name end,
        case when removed then null else pr.avatar_path end,
        case when removed then null else pr.provider_avatar_url end,
        (select count(*)::int from public.comment_likes l where l.comment_id = t.id),
        exists (select 1 from public.comment_likes l
                where l.comment_id = t.id and l.user_id = (select auth.uid()))
    from tree t
    cross join lateral (select (t.status <> 'visible' or t.deleted_at is not null) as removed) r
    left join public.profiles pr on pr.id = t.author_id
    order by t.created_at, t.id;
$$;

-- Comment counts for the index page, in one round trip.
create function public.comment_counts(p_slugs text[])
returns table (slug text, comments integer, likes integer)
language sql stable security definer set search_path = ''
as $$
    select p.slug,
           (select count(*)::int from public.comments c
            where c.post_id = p.id and c.status = 'visible' and c.deleted_at is null),
           (select count(*)::int from public.post_likes l where l.post_id = p.id)
    from public.posts p
    where p.published and p.slug = any (p_slugs[1:200]);
$$;

-- The signed-in user's own account state, for the account page.
create function public.my_account()
returns jsonb
language sql stable security definer set search_path = ''
as $$
    select case when auth.uid() is null then null else jsonb_build_object(
        'is_admin', public.is_admin(),
        'banned', exists (select 1 from public.user_moderation m
                          where m.user_id = auth.uid() and m.banned_at is not null),
        'username_changed_at', (select username_changed_at from public.profiles where id = auth.uid())
    ) end;
$$;

-- ── Admin functions ──────────────────────────────────────────────────────

create function public.moderate_comment(p_comment_id uuid, p_action text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
    if not public.is_admin() then
        raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    if p_action = 'hide' then
        update public.comments set status = 'hidden' where id = p_comment_id;
    elsif p_action = 'restore' then
        update public.comments set status = 'visible' where id = p_comment_id;
        update public.comment_reports set resolved_at = now(), resolved_by = auth.uid()
            where comment_id = p_comment_id and resolved_at is null;
    elsif p_action = 'delete' then
        -- Removes the comment and its replies. Use "hide" to keep a thread.
        delete from public.comments where id = p_comment_id;
    elsif p_action = 'dismiss_reports' then
        update public.comment_reports set resolved_at = now(), resolved_by = auth.uid()
            where comment_id = p_comment_id and resolved_at is null;
    else
        raise exception 'INVALID_INPUT' using errcode = '22023';
    end if;
end;
$$;

create function public.set_user_ban(p_user_id uuid, p_banned boolean, p_reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
    if not public.is_admin() then
        raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    if exists (select 1 from public.user_roles where user_id = p_user_id) then
        raise exception 'INVALID: admins cannot be banned' using errcode = 'P0001';
    end if;
    insert into public.user_moderation (user_id, banned_at, ban_reason, banned_by, updated_at)
    values (p_user_id,
            case when p_banned then now() end,
            case when p_banned then left(p_reason, 300) end,
            case when p_banned then auth.uid() end,
            now())
    on conflict (user_id) do update set
        banned_at  = excluded.banned_at,
        ban_reason = excluded.ban_reason,
        banned_by  = excluded.banned_by,
        updated_at = now();
end;
$$;

-- Users for the dashboard: public profile fields plus activity and ban
-- state. No email, no auth metadata.
create function public.admin_list_users(p_search text default null, p_limit int default 50, p_offset int default 0)
returns table (
    id uuid, username text, display_name text, created_at timestamptz,
    comment_count integer, banned_at timestamptz, ban_reason text, is_admin boolean
)
language plpgsql stable security definer set search_path = ''
as $$
begin
    if not public.is_admin() then
        raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    return query
        select p.id, p.username, p.display_name, p.created_at,
               (select count(*)::int from public.comments c where c.author_id = p.id),
               m.banned_at, m.ban_reason,
               exists (select 1 from public.user_roles r where r.user_id = p.id)
        from public.profiles p
        left join public.user_moderation m on m.user_id = p.id
        where p_search is null or p_search = ''
           or p.username ilike '%' || p_search || '%'
           or p.display_name ilike '%' || p_search || '%'
        order by p.created_at desc
        limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0);
end;
$$;

create function public.admin_overview()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
    if not public.is_admin() then
        raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    return jsonb_build_object(
        'users',          (select count(*) from public.profiles),
        'comments',       (select count(*) from public.comments where deleted_at is null),
        'hidden',         (select count(*) from public.comments where status = 'hidden' and deleted_at is null),
        'open_reports',   (select count(*) from public.comment_reports where resolved_at is null),
        'post_likes',     (select count(*) from public.post_likes),
        'views_30d',      (select coalesce(sum(views), 0) from public.post_views_daily where day > current_date - 30),
        'registered_posts', (select count(*) from public.posts where published),
        'top_posts', (
            select coalesce(jsonb_agg(t), '[]'::jsonb) from (
                select p.slug, p.title, sum(v.views)::int as views
                from public.post_views_daily v join public.posts p on p.id = v.post_id
                where v.day > current_date - 30
                group by p.slug, p.title order by views desc limit 5
            ) t
        )
    );
end;
$$;

-- ── Account deletion ─────────────────────────────────────────────────────

-- Deletes the caller's account. Comments that others have replied to are
-- scrubbed to placeholders (so those replies keep their context); the rest go
-- with the account, as do likes, reports and the profile. Avatar files are
-- removed by the client through the Storage API first (Supabase does not
-- allow deleting storage objects from SQL).
create function public.delete_my_account()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
    me uuid := auth.uid();
begin
    if me is null then
        raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
    end if;
    if exists (select 1 from public.user_roles where user_id = me) then
        raise exception 'INVALID: remove the admin role in the SQL editor before deleting this account'
            using errcode = 'P0001';
    end if;

    update public.comments c set body = '', deleted_at = now()
        where c.author_id = me
          and exists (select 1 from public.comments r where r.parent_id = c.id);
    delete from public.comments c
        where c.author_id = me and c.deleted_at is null;
    -- Scrubbed placeholders lose their author when the profile goes (set null).

    delete from auth.users where id = me;
end;
$$;

-- ── Function privileges ──────────────────────────────────────────────────
-- Supabase grants EXECUTE on new functions to anon by default. Narrow it.

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.is_admin()                                 to anon, authenticated;
grant execute on function public.can_participate()                          to anon, authenticated;
grant execute on function public.record_view(text)                          to anon, authenticated;
grant execute on function public.post_like_count(uuid)                      to anon, authenticated;
grant execute on function public.get_post_comments(uuid, timestamptz, uuid, integer) to anon, authenticated;
grant execute on function public.comment_counts(text[])                     to anon, authenticated;
grant execute on function public.my_account()                               to authenticated;
grant execute on function public.delete_comment(uuid)                       to authenticated;
grant execute on function public.delete_my_account()                        to authenticated;
grant execute on function public.sync_posts(jsonb)                          to authenticated;
grant execute on function public.moderate_comment(uuid, text)               to authenticated;
grant execute on function public.set_user_ban(uuid, boolean, text)          to authenticated;
grant execute on function public.admin_list_users(text, integer, integer)   to authenticated;
grant execute on function public.admin_overview()                           to authenticated;
-- Trigger functions need no grants: triggers run regardless of EXECUTE.

-- ── Storage: avatars ─────────────────────────────────────────────────────
-- Size and type are enforced by the bucket itself, server side. SVG and GIF
-- are deliberately excluded (script content / animated abuse).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 524288, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "upload own avatar" on storage.objects
    for insert to authenticated with check (
        bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
        and (select public.can_participate())
    );
create policy "replace own avatar" on storage.objects
    for update to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own avatar" on storage.objects
    for delete to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- No SELECT policy is needed: the bucket is public, so files are served by
-- URL, and listing other users' folders stays denied.
