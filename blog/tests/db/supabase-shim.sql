-- The slice of a Supabase database the migration depends on, so it can run
-- inside PGlite: the API roles, auth.users + auth.uid(), storage.buckets /
-- objects + storage.foldername(), and Supabase's default grants (which hand
-- every new table and function to anon/authenticated — the migration has to
-- narrow those itself, and these tests prove it does).

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
    id                 uuid primary key default gen_random_uuid(),
    email              text,
    raw_user_meta_data jsonb default '{}'::jsonb,
    created_at         timestamptz default now()
);
-- One row per sign-in method. provider_id is the provider's stable account id
-- (Google's "sub"), which stays the same if the account is deleted and re-created.
create table auth.identities (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references auth.users (id) on delete cascade,
    provider      text not null,
    provider_id   text not null,
    identity_data jsonb default '{}'::jsonb,
    created_at    timestamptz default now(),
    unique (provider_id, provider)
);
create function auth.uid() returns uuid language sql stable as $$
    select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

create schema storage;
create table storage.buckets (
    id text primary key, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
    id        uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name      text not null,
    owner     uuid default auth.uid()
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
