-- "Liked by author": get_post_comments also reports whether an admin (the
-- blog's author) liked each comment, like TikTok's "liked by creator".
-- Only a yes/no comes back; which admin liked it stays private.
-- The return type changes, so the function is dropped and recreated.

drop function public.get_post_comments(uuid, timestamptz, uuid, integer);

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
    liked_by_me         boolean,
    liked_by_author     boolean
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
                where l.comment_id = t.id and l.user_id = (select auth.uid())),
        exists (select 1 from public.comment_likes l
                join public.user_roles r on r.user_id = l.user_id and r.role = 'admin'
                where l.comment_id = t.id)
    from tree t
    cross join lateral (select (t.status <> 'visible' or t.deleted_at is not null) as removed) r
    left join public.profiles pr on pr.id = t.author_id
    order by t.created_at, t.id;
$$;

revoke all on function public.get_post_comments(uuid, timestamptz, uuid, integer) from public;
grant execute on function public.get_post_comments(uuid, timestamptz, uuid, integer) to anon, authenticated;
