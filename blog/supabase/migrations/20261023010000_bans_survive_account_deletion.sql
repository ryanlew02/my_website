-- Bans survive account deletion.
--
-- A ban lives in user_moderation, keyed by the auth user id, and is removed
-- with the account. Someone who was banned could delete their account and
-- sign in with Google again to get a fresh, unbanned one. So a ban now also
-- records what stays the same across sign-ups: each sign-in identity
-- (e.g. 'google:<Google account id>') and the email address. A new sign-in
-- that matches any of them starts out banned.
--
-- Privacy: only banned users have rows here, and only these keys plus the
-- reason. Unbanning removes them.

create table public.banned_identities (
    key        text primary key,          -- 'google:<provider id>' or 'email:<lowercased address>'
    -- Keys gathered from one person share a ban_id, so unbanning any of
    -- their accounts clears all of them.
    ban_id     uuid not null default gen_random_uuid(),
    banned_at  timestamptz not null default now(),
    ban_reason text check (char_length(ban_reason) <= 300)
);
-- No policies and no grants: only the security definer functions below touch it.
alter table public.banned_identities enable row level security;
revoke all on public.banned_identities from anon, authenticated;

-- Everything that identifies a user across accounts.
create function public.identity_keys(p_user_id uuid)
returns setof text
language sql stable security definer set search_path = ''
as $$
    select i.provider || ':' || i.provider_id from auth.identities i where i.user_id = p_user_id
    union
    select 'email:' || lower(u.email) from auth.users u where u.id = p_user_id and u.email is not null and u.email <> '';
$$;

-- Same signature as before; now also records or clears the identity keys.
create or replace function public.set_user_ban(p_user_id uuid, p_banned boolean, p_reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
    group_id uuid;
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

    if p_banned then
        select b.ban_id into group_id from public.banned_identities b
        where b.key in (select public.identity_keys(p_user_id)) limit 1;
        group_id := coalesce(group_id, gen_random_uuid());  -- one id for all of this person's keys
        insert into public.banned_identities (key, ban_id, ban_reason)
        select k, group_id, left(p_reason, 300)
        from public.identity_keys(p_user_id) k
        on conflict (key) do update set ban_reason = excluded.ban_reason;
    else
        delete from public.banned_identities
        where ban_id in (select b.ban_id from public.banned_identities b
                         where b.key in (select public.identity_keys(p_user_id)));
    end if;
end;
$$;

-- Supabase inserts the identity right after the user row when someone signs
-- up (or links another sign-in method), so this is where a returning banned
-- person is caught.
create function public.carry_over_ban()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
    hit public.banned_identities;
begin
    select b.* into hit from public.banned_identities b
    where b.key = new.provider || ':' || new.provider_id
       or b.key = 'email:' || lower(nullif(new.identity_data ->> 'email', ''))
       or b.key in (select 'email:' || lower(u.email) from auth.users u
                    where u.id = new.user_id and u.email is not null and u.email <> '')
    limit 1;
    if found then
        insert into public.user_moderation (user_id, banned_at, ban_reason, updated_at)
        values (new.user_id, now(), hit.ban_reason, now())
        on conflict (user_id) do update set
            banned_at  = coalesce(public.user_moderation.banned_at, excluded.banned_at),
            ban_reason = coalesce(public.user_moderation.ban_reason, excluded.ban_reason),
            updated_at = now();
        -- Remember this account's other keys too (e.g. a new email).
        insert into public.banned_identities (key, ban_id, ban_reason)
        select k, hit.ban_id, hit.ban_reason from public.identity_keys(new.user_id) k
        on conflict (key) do nothing;
    end if;
    return null;
end;
$$;

create trigger on_auth_identity_created after insert on auth.identities
    for each row execute function public.carry_over_ban();

-- Bans made before this migration.
insert into public.banned_identities (key, ban_id, ban_reason)
select k, m.user_id, m.ban_reason
from public.user_moderation m
cross join lateral public.identity_keys(m.user_id) k
where m.banned_at is not null
on conflict (key) do nothing;

revoke execute on function public.identity_keys(uuid) from public, anon, authenticated;
revoke execute on function public.carry_over_ban() from public, anon, authenticated;
revoke execute on function public.set_user_ban(uuid, boolean, text) from public, anon;
grant execute on function public.set_user_ban(uuid, boolean, text) to authenticated;
