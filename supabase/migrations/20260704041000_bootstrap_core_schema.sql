create extension if not exists pgcrypto;
create extension if not exists vector;

do $$
begin
  create type public.group_role as enum ('owner', 'member');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.share_permission as enum ('read', 'write');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.share_resource_type as enum ('knowledge_base', 'folder');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.sync_resource_type as enum ('knowledge_base', 'folder', 'note');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.sync_operation as enum ('upsert', 'delete');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.sync_status as enum ('synced', 'pending', 'conflict', 'failed');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.embedding_job_status as enum ('pending', 'processing', 'succeeded', 'failed', 'skipped');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.api_key_scope_type as enum ('user', 'group');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.api_key_status as enum ('active', 'revoked');
exception when duplicate_object then null;
end $$;

alter type public.group_role add value if not exists 'owner';
alter type public.group_role add value if not exists 'member';
alter type public.invitation_status add value if not exists 'pending';
alter type public.invitation_status add value if not exists 'accepted';
alter type public.invitation_status add value if not exists 'expired';
alter type public.invitation_status add value if not exists 'revoked';
alter type public.share_permission add value if not exists 'read';
alter type public.share_permission add value if not exists 'write';
alter type public.share_resource_type add value if not exists 'knowledge_base';
alter type public.share_resource_type add value if not exists 'folder';
alter type public.sync_resource_type add value if not exists 'knowledge_base';
alter type public.sync_resource_type add value if not exists 'folder';
alter type public.sync_resource_type add value if not exists 'note';
alter type public.sync_operation add value if not exists 'upsert';
alter type public.sync_operation add value if not exists 'delete';
alter type public.sync_status add value if not exists 'synced';
alter type public.sync_status add value if not exists 'pending';
alter type public.sync_status add value if not exists 'conflict';
alter type public.sync_status add value if not exists 'failed';
alter type public.embedding_job_status add value if not exists 'pending';
alter type public.embedding_job_status add value if not exists 'processing';
alter type public.embedding_job_status add value if not exists 'succeeded';
alter type public.embedding_job_status add value if not exists 'failed';
alter type public.embedding_job_status add value if not exists 'skipped';
alter type public.api_key_scope_type add value if not exists 'user';
alter type public.api_key_scope_type add value if not exists 'group';
alter type public.api_key_status add value if not exists 'active';
alter type public.api_key_status add value if not exists 'revoked';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.lock_owner_user_id()
returns trigger
language plpgsql
as $$
begin
  if old.owner_user_id <> new.owner_user_id then
    raise exception 'owner_user_id is immutable';
  end if;

  return new;
end;
$$;

create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  default_workspace_id uuid null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.knowledge_bases (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 255),
  description text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz null
);

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  knowledge_base_id uuid not null references public.knowledge_bases (id) on delete cascade,
  parent_folder_id uuid null references public.folders (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 255),
  sort_key text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz null
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  knowledge_base_id uuid not null references public.knowledge_bases (id) on delete cascade,
  folder_id uuid null references public.folders (id) on delete set null,
  title text not null check (char_length(title) between 1 and 255),
  markdown_content text not null default '',
  content_hash text not null,
  local_source_path text null,
  version bigint not null default 1 check (version >= 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz null
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 255),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  inviter_user_id uuid not null references auth.users (id) on delete cascade,
  invitee_email text not null,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.group_role not null default 'member',
  joined_at timestamptz not null default timezone('utc', now()),
  unique (group_id, user_id)
);

create table if not exists public.resource_shares (
  id uuid primary key default gen_random_uuid(),
  resource_type public.share_resource_type not null,
  resource_id uuid not null,
  group_id uuid not null references public.groups (id) on delete cascade,
  permission public.share_permission not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (resource_type, resource_id, group_id)
);

create table if not exists public.sync_events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  resource_type public.sync_resource_type not null,
  resource_id uuid not null,
  operation public.sync_operation not null,
  local_version bigint not null default 1 check (local_version >= 1),
  cloud_version bigint null check (cloud_version is null or cloud_version >= 1),
  status public.sync_status not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.embedding_jobs (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  content_hash text not null,
  status public.embedding_job_status not null default 'pending',
  error_message text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (note_id, content_hash)
);

create table if not exists public.note_chunks (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  share_scope jsonb not null default '[]'::jsonb,
  chunk_index integer not null check (chunk_index >= 0),
  chunk_text text not null,
  content_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (note_id, content_hash, chunk_index)
);

create table if not exists public.note_embeddings (
  chunk_id uuid primary key references public.note_chunks (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  embedding vector(1536) not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  key_hash text not null unique,
  scope_type public.api_key_scope_type not null,
  scope_id uuid null,
  status public.api_key_status not null default 'active',
  last_used_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz null
);

alter table public.user_profiles add column if not exists display_name text not null default '';
alter table public.user_profiles add column if not exists default_workspace_id uuid null;
alter table public.user_profiles add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.user_profiles add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.knowledge_bases add column if not exists owner_user_id uuid references auth.users (id) on delete cascade;
alter table public.knowledge_bases add column if not exists name text not null default 'Untitled knowledge base';
alter table public.knowledge_bases add column if not exists description text null;
alter table public.knowledge_bases add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.knowledge_bases add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.knowledge_bases add column if not exists deleted_at timestamptz null;

alter table public.folders add column if not exists owner_user_id uuid references auth.users (id) on delete cascade;
alter table public.folders add column if not exists knowledge_base_id uuid references public.knowledge_bases (id) on delete cascade;
alter table public.folders add column if not exists parent_folder_id uuid references public.folders (id) on delete cascade;
alter table public.folders add column if not exists title text not null default 'Untitled folder';
alter table public.folders add column if not exists sort_key text not null default '';
alter table public.folders add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.folders add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.folders add column if not exists deleted_at timestamptz null;

alter table public.notes add column if not exists owner_user_id uuid references auth.users (id) on delete cascade;
alter table public.notes add column if not exists knowledge_base_id uuid references public.knowledge_bases (id) on delete cascade;
alter table public.notes add column if not exists folder_id uuid references public.folders (id) on delete set null;
alter table public.notes add column if not exists title text not null default 'Untitled note';
alter table public.notes add column if not exists markdown_content text not null default '';
alter table public.notes add column if not exists content_hash text not null default '';
alter table public.notes add column if not exists local_source_path text null;
alter table public.notes add column if not exists version bigint not null default 1;
alter table public.notes add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.notes add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.notes add column if not exists deleted_at timestamptz null;

alter table public.groups add column if not exists owner_user_id uuid references auth.users (id) on delete cascade;
alter table public.groups add column if not exists name text not null default 'Untitled group';
alter table public.groups add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.groups add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.group_invitations add column if not exists group_id uuid references public.groups (id) on delete cascade;
alter table public.group_invitations add column if not exists inviter_user_id uuid references auth.users (id) on delete cascade;
alter table public.group_invitations add column if not exists invitee_email text not null default '';
alter table public.group_invitations add column if not exists status public.invitation_status not null default 'pending';
alter table public.group_invitations add column if not exists expires_at timestamptz not null default timezone('utc', now());
alter table public.group_invitations add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.group_invitations add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.group_members add column if not exists group_id uuid references public.groups (id) on delete cascade;
alter table public.group_members add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.group_members add column if not exists role public.group_role not null default 'member';
alter table public.group_members add column if not exists joined_at timestamptz not null default timezone('utc', now());

alter table public.resource_shares add column if not exists resource_type public.share_resource_type not null default 'knowledge_base';
alter table public.resource_shares add column if not exists resource_id uuid;
alter table public.resource_shares add column if not exists group_id uuid references public.groups (id) on delete cascade;
alter table public.resource_shares add column if not exists permission public.share_permission not null default 'read';
alter table public.resource_shares add column if not exists created_by uuid references auth.users (id) on delete cascade;
alter table public.resource_shares add column if not exists created_at timestamptz not null default timezone('utc', now());

alter table public.sync_events add column if not exists owner_user_id uuid references auth.users (id) on delete cascade;
alter table public.sync_events add column if not exists resource_type public.sync_resource_type not null default 'note';
alter table public.sync_events add column if not exists resource_id uuid;
alter table public.sync_events add column if not exists operation public.sync_operation not null default 'upsert';
alter table public.sync_events add column if not exists local_version bigint not null default 1;
alter table public.sync_events add column if not exists cloud_version bigint null;
alter table public.sync_events add column if not exists status public.sync_status not null default 'pending';
alter table public.sync_events add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.sync_events add column if not exists created_at timestamptz not null default timezone('utc', now());

alter table public.embedding_jobs add column if not exists note_id uuid references public.notes (id) on delete cascade;
alter table public.embedding_jobs add column if not exists owner_user_id uuid references auth.users (id) on delete cascade;
alter table public.embedding_jobs add column if not exists content_hash text not null default '';
alter table public.embedding_jobs add column if not exists status public.embedding_job_status not null default 'pending';
alter table public.embedding_jobs add column if not exists error_message text null;
alter table public.embedding_jobs add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.embedding_jobs add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.note_chunks add column if not exists note_id uuid references public.notes (id) on delete cascade;
alter table public.note_chunks add column if not exists owner_user_id uuid references auth.users (id) on delete cascade;
alter table public.note_chunks add column if not exists share_scope jsonb not null default '[]'::jsonb;
alter table public.note_chunks add column if not exists chunk_index integer not null default 0;
alter table public.note_chunks add column if not exists chunk_text text not null default '';
alter table public.note_chunks add column if not exists content_hash text not null default '';
alter table public.note_chunks add column if not exists created_at timestamptz not null default timezone('utc', now());

alter table public.note_embeddings add column if not exists owner_user_id uuid references auth.users (id) on delete cascade;
alter table public.note_embeddings add column if not exists embedding vector(1536);
alter table public.note_embeddings add column if not exists created_at timestamptz not null default timezone('utc', now());

alter table public.api_keys add column if not exists owner_user_id uuid references auth.users (id) on delete cascade;
alter table public.api_keys add column if not exists key_hash text;
alter table public.api_keys add column if not exists scope_type public.api_key_scope_type not null default 'user';
alter table public.api_keys add column if not exists scope_id uuid null;
alter table public.api_keys add column if not exists status public.api_key_status not null default 'active';
alter table public.api_keys add column if not exists last_used_at timestamptz null;
alter table public.api_keys add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.api_keys add column if not exists revoked_at timestamptz null;

do $$
begin
  alter table public.user_profiles
    add constraint user_profiles_default_workspace_fk
    foreign key (default_workspace_id)
    references public.knowledge_bases (id)
    on delete set null;
exception when duplicate_object then null;
end $$;

create index if not exists knowledge_bases_owner_idx on public.knowledge_bases (owner_user_id);
create index if not exists folders_owner_idx on public.folders (owner_user_id);
create index if not exists folders_knowledge_base_idx on public.folders (knowledge_base_id);
create index if not exists folders_parent_idx on public.folders (parent_folder_id);
create index if not exists notes_owner_idx on public.notes (owner_user_id);
create index if not exists notes_knowledge_base_idx on public.notes (knowledge_base_id);
create index if not exists notes_folder_idx on public.notes (folder_id);
create index if not exists groups_owner_idx on public.groups (owner_user_id);
create index if not exists group_invitations_group_idx on public.group_invitations (group_id);
create index if not exists group_invitations_email_idx on public.group_invitations (lower(invitee_email));
create index if not exists group_members_group_idx on public.group_members (group_id);
create index if not exists group_members_user_idx on public.group_members (user_id);
create index if not exists resource_shares_group_idx on public.resource_shares (group_id);
create index if not exists resource_shares_lookup_idx on public.resource_shares (resource_type, resource_id);
create index if not exists sync_events_owner_idx on public.sync_events (owner_user_id, created_at desc);
create index if not exists embedding_jobs_note_idx on public.embedding_jobs (note_id, status);
create index if not exists note_chunks_note_idx on public.note_chunks (note_id, chunk_index);
create index if not exists note_embeddings_owner_idx on public.note_embeddings (owner_user_id);
create index if not exists api_keys_owner_idx on public.api_keys (owner_user_id, status);
create unique index if not exists group_members_group_user_uidx on public.group_members (group_id, user_id);
create unique index if not exists resource_shares_resource_group_uidx on public.resource_shares (resource_type, resource_id, group_id);
create unique index if not exists embedding_jobs_note_hash_uidx on public.embedding_jobs (note_id, content_hash);
create unique index if not exists note_chunks_note_hash_index_uidx on public.note_chunks (note_id, content_hash, chunk_index);
create unique index if not exists api_keys_key_hash_uidx on public.api_keys (key_hash);

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_knowledge_bases_updated_at on public.knowledge_bases;
create trigger set_knowledge_bases_updated_at
before update on public.knowledge_bases
for each row
execute function public.set_updated_at();

drop trigger if exists set_folders_updated_at on public.folders;
create trigger set_folders_updated_at
before update on public.folders
for each row
execute function public.set_updated_at();

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
before update on public.notes
for each row
execute function public.set_updated_at();

drop trigger if exists set_groups_updated_at on public.groups;
create trigger set_groups_updated_at
before update on public.groups
for each row
execute function public.set_updated_at();

drop trigger if exists set_group_invitations_updated_at on public.group_invitations;
create trigger set_group_invitations_updated_at
before update on public.group_invitations
for each row
execute function public.set_updated_at();

drop trigger if exists set_embedding_jobs_updated_at on public.embedding_jobs;
create trigger set_embedding_jobs_updated_at
before update on public.embedding_jobs
for each row
execute function public.set_updated_at();

drop trigger if exists lock_knowledge_bases_owner_user_id on public.knowledge_bases;
create trigger lock_knowledge_bases_owner_user_id
before update on public.knowledge_bases
for each row
execute function public.lock_owner_user_id();

drop trigger if exists lock_folders_owner_user_id on public.folders;
create trigger lock_folders_owner_user_id
before update on public.folders
for each row
execute function public.lock_owner_user_id();

drop trigger if exists lock_notes_owner_user_id on public.notes;
create trigger lock_notes_owner_user_id
before update on public.notes
for each row
execute function public.lock_owner_user_id();

drop trigger if exists lock_groups_owner_user_id on public.groups;
create trigger lock_groups_owner_user_id
before update on public.groups
for each row
execute function public.lock_owner_user_id();

drop trigger if exists lock_sync_events_owner_user_id on public.sync_events;
create trigger lock_sync_events_owner_user_id
before update on public.sync_events
for each row
execute function public.lock_owner_user_id();

drop trigger if exists lock_embedding_jobs_owner_user_id on public.embedding_jobs;
create trigger lock_embedding_jobs_owner_user_id
before update on public.embedding_jobs
for each row
execute function public.lock_owner_user_id();

drop trigger if exists lock_note_chunks_owner_user_id on public.note_chunks;
create trigger lock_note_chunks_owner_user_id
before update on public.note_chunks
for each row
execute function public.lock_owner_user_id();

drop trigger if exists lock_note_embeddings_owner_user_id on public.note_embeddings;
create trigger lock_note_embeddings_owner_user_id
before update on public.note_embeddings
for each row
execute function public.lock_owner_user_id();

drop trigger if exists lock_api_keys_owner_user_id on public.api_keys;
create trigger lock_api_keys_owner_user_id
before update on public.api_keys
for each row
execute function public.lock_owner_user_id();

create or replace function public.is_group_member(target_group_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = coalesce(target_user_id, auth.uid())
  );
$$;

create or replace function public.is_group_owner(target_group_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups g
    where g.id = target_group_id
      and g.owner_user_id = coalesce(target_user_id, auth.uid())
  );
$$;

create or replace function public.owns_shareable_resource(
  target_resource_type text,
  target_resource_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when target_resource_type = 'knowledge_base' then exists (
      select 1
      from public.knowledge_bases kb
      where kb.id = target_resource_id
        and kb.owner_user_id = coalesce(target_user_id, auth.uid())
    )
    when target_resource_type = 'folder' then exists (
      select 1
      from public.folders f
      where f.id = target_resource_id
        and f.owner_user_id = coalesce(target_user_id, auth.uid())
    )
    else false
  end;
$$;

create or replace function public.can_read_shared_resource(
  target_resource_type text,
  target_resource_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.resource_shares rs
    join public.group_members gm on gm.group_id = rs.group_id
    where rs.resource_type::text = target_resource_type
      and rs.resource_id = target_resource_id
      and gm.user_id = coalesce(target_user_id, auth.uid())
  );
$$;

create or replace function public.can_write_shared_resource(
  target_resource_type text,
  target_resource_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.resource_shares rs
    join public.group_members gm on gm.group_id = rs.group_id
    where rs.resource_type::text = target_resource_type
      and rs.resource_id = target_resource_id
      and rs.permission = 'write'
      and gm.user_id = coalesce(target_user_id, auth.uid())
  );
$$;

create or replace function public.can_read_knowledge_base(target_knowledge_base_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.knowledge_bases kb
    where kb.id = target_knowledge_base_id
      and (
        kb.owner_user_id = coalesce(target_user_id, auth.uid())
        or public.can_read_shared_resource('knowledge_base'::text, kb.id, coalesce(target_user_id, auth.uid()))
      )
  );
$$;

create or replace function public.can_write_knowledge_base(target_knowledge_base_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.knowledge_bases kb
    where kb.id = target_knowledge_base_id
      and (
        kb.owner_user_id = coalesce(target_user_id, auth.uid())
        or public.can_write_shared_resource('knowledge_base'::text, kb.id, coalesce(target_user_id, auth.uid()))
      )
  );
$$;

create or replace function public.can_read_folder(target_folder_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.folders f
    where f.id = target_folder_id
      and (
        f.owner_user_id = coalesce(target_user_id, auth.uid())
        or public.can_read_shared_resource('folder'::text, f.id, coalesce(target_user_id, auth.uid()))
        or public.can_read_shared_resource('knowledge_base'::text, f.knowledge_base_id, coalesce(target_user_id, auth.uid()))
      )
  );
$$;

create or replace function public.can_write_folder(target_folder_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.folders f
    where f.id = target_folder_id
      and (
        f.owner_user_id = coalesce(target_user_id, auth.uid())
        or public.can_write_shared_resource('folder'::text, f.id, coalesce(target_user_id, auth.uid()))
        or public.can_write_shared_resource('knowledge_base'::text, f.knowledge_base_id, coalesce(target_user_id, auth.uid()))
      )
  );
$$;

create or replace function public.can_read_note(target_note_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.notes n
    where n.id = target_note_id
      and (
        n.owner_user_id = coalesce(target_user_id, auth.uid())
        or (n.folder_id is not null and public.can_read_folder(n.folder_id, coalesce(target_user_id, auth.uid())))
        or public.can_read_knowledge_base(n.knowledge_base_id, coalesce(target_user_id, auth.uid()))
      )
  );
$$;

create or replace function public.can_write_note(target_note_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.notes n
    where n.id = target_note_id
      and (
        n.owner_user_id = coalesce(target_user_id, auth.uid())
        or (n.folder_id is not null and public.can_write_folder(n.folder_id, coalesce(target_user_id, auth.uid())))
        or public.can_write_knowledge_base(n.knowledge_base_id, coalesce(target_user_id, auth.uid()))
      )
  );
$$;

alter table public.user_profiles enable row level security;
alter table public.user_profiles force row level security;
alter table public.knowledge_bases enable row level security;
alter table public.knowledge_bases force row level security;
alter table public.folders enable row level security;
alter table public.folders force row level security;
alter table public.notes enable row level security;
alter table public.notes force row level security;
alter table public.groups enable row level security;
alter table public.groups force row level security;
alter table public.group_invitations enable row level security;
alter table public.group_invitations force row level security;
alter table public.group_members enable row level security;
alter table public.group_members force row level security;
alter table public.resource_shares enable row level security;
alter table public.resource_shares force row level security;
alter table public.sync_events enable row level security;
alter table public.sync_events force row level security;
alter table public.embedding_jobs enable row level security;
alter table public.embedding_jobs force row level security;
alter table public.note_chunks enable row level security;
alter table public.note_chunks force row level security;
alter table public.note_embeddings enable row level security;
alter table public.note_embeddings force row level security;
alter table public.api_keys enable row level security;
alter table public.api_keys force row level security;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own" on public.user_profiles
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own" on public.user_profiles
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own" on public.user_profiles
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "knowledge_bases_select_accessible" on public.knowledge_bases;
create policy "knowledge_bases_select_accessible" on public.knowledge_bases
for select to authenticated
using (public.can_read_knowledge_base(id, auth.uid()));

drop policy if exists "knowledge_bases_insert_own" on public.knowledge_bases;
create policy "knowledge_bases_insert_own" on public.knowledge_bases
for insert to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists "knowledge_bases_update_accessible" on public.knowledge_bases;
create policy "knowledge_bases_update_accessible" on public.knowledge_bases
for update to authenticated
using (public.can_write_knowledge_base(id, auth.uid()));

drop policy if exists "knowledge_bases_delete_accessible" on public.knowledge_bases;
create policy "knowledge_bases_delete_accessible" on public.knowledge_bases
for delete to authenticated
using (public.can_write_knowledge_base(id, auth.uid()));

drop policy if exists "folders_select_accessible" on public.folders;
create policy "folders_select_accessible" on public.folders
for select to authenticated
using (public.can_read_folder(id, auth.uid()));

drop policy if exists "folders_insert_accessible" on public.folders;
create policy "folders_insert_accessible" on public.folders
for insert to authenticated
with check (
  owner_user_id = auth.uid()
  and public.can_write_knowledge_base(knowledge_base_id, auth.uid())
  and (parent_folder_id is null or public.can_write_folder(parent_folder_id, auth.uid()))
);

drop policy if exists "folders_update_accessible" on public.folders;
create policy "folders_update_accessible" on public.folders
for update to authenticated
using (public.can_write_folder(id, auth.uid()))
with check (
  public.can_write_knowledge_base(knowledge_base_id, auth.uid())
  and (parent_folder_id is null or public.can_write_folder(parent_folder_id, auth.uid()))
);

drop policy if exists "folders_delete_accessible" on public.folders;
create policy "folders_delete_accessible" on public.folders
for delete to authenticated
using (public.can_write_folder(id, auth.uid()));

drop policy if exists "notes_select_accessible" on public.notes;
create policy "notes_select_accessible" on public.notes
for select to authenticated
using (public.can_read_note(id, auth.uid()));

drop policy if exists "notes_insert_accessible" on public.notes;
create policy "notes_insert_accessible" on public.notes
for insert to authenticated
with check (
  owner_user_id = auth.uid()
  and public.can_write_knowledge_base(knowledge_base_id, auth.uid())
  and (folder_id is null or public.can_write_folder(folder_id, auth.uid()))
);

drop policy if exists "notes_update_accessible" on public.notes;
create policy "notes_update_accessible" on public.notes
for update to authenticated
using (public.can_write_note(id, auth.uid()))
with check (
  public.can_write_knowledge_base(knowledge_base_id, auth.uid())
  and (folder_id is null or public.can_write_folder(folder_id, auth.uid()))
);

drop policy if exists "notes_delete_accessible" on public.notes;
create policy "notes_delete_accessible" on public.notes
for delete to authenticated
using (public.can_write_note(id, auth.uid()));

drop policy if exists "groups_select_member_or_owner" on public.groups;
create policy "groups_select_member_or_owner" on public.groups
for select to authenticated
using (
  owner_user_id = auth.uid()
  or public.is_group_member(id, auth.uid())
);

drop policy if exists "groups_insert_owner" on public.groups;
create policy "groups_insert_owner" on public.groups
for insert to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists "groups_update_owner" on public.groups;
create policy "groups_update_owner" on public.groups
for update to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "groups_delete_owner" on public.groups;
create policy "groups_delete_owner" on public.groups
for delete to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "group_invitations_select_visible" on public.group_invitations;
create policy "group_invitations_select_visible" on public.group_invitations
for select to authenticated
using (
  public.is_group_owner(group_id, auth.uid())
  or inviter_user_id = auth.uid()
  or lower(invitee_email) = public.current_user_email()
);

drop policy if exists "group_invitations_insert_group_owner" on public.group_invitations;
create policy "group_invitations_insert_group_owner" on public.group_invitations
for insert to authenticated
with check (
  inviter_user_id = auth.uid()
  and public.is_group_owner(group_id, auth.uid())
);

drop policy if exists "group_invitations_update_visible" on public.group_invitations;
create policy "group_invitations_update_visible" on public.group_invitations
for update to authenticated
using (
  public.is_group_owner(group_id, auth.uid())
  or lower(invitee_email) = public.current_user_email()
);

drop policy if exists "group_invitations_delete_group_owner" on public.group_invitations;
create policy "group_invitations_delete_group_owner" on public.group_invitations
for delete to authenticated
using (public.is_group_owner(group_id, auth.uid()));

drop policy if exists "group_members_select_group_members" on public.group_members;
create policy "group_members_select_group_members" on public.group_members
for select to authenticated
using (
  user_id = auth.uid()
  or public.is_group_member(group_id, auth.uid())
  or public.is_group_owner(group_id, auth.uid())
);

drop policy if exists "group_members_insert_owner_or_accept_invite" on public.group_members;
create policy "group_members_insert_owner_or_accept_invite" on public.group_members
for insert to authenticated
with check (
  public.is_group_owner(group_id, auth.uid())
  or (
    user_id = auth.uid()
    and exists (
      select 1
      from public.group_invitations gi
      where gi.group_id = group_members.group_id
        and lower(gi.invitee_email) = public.current_user_email()
        and gi.status = 'pending'
        and gi.expires_at > timezone('utc', now())
    )
  )
);

drop policy if exists "group_members_update_group_owner" on public.group_members;
create policy "group_members_update_group_owner" on public.group_members
for update to authenticated
using (public.is_group_owner(group_id, auth.uid()));

drop policy if exists "group_members_delete_owner_or_self" on public.group_members;
create policy "group_members_delete_owner_or_self" on public.group_members
for delete to authenticated
using (
  public.is_group_owner(group_id, auth.uid())
  or user_id = auth.uid()
);

drop policy if exists "resource_shares_select_visible" on public.resource_shares;
create policy "resource_shares_select_visible" on public.resource_shares
for select to authenticated
using (
  public.is_group_member(group_id, auth.uid())
  or public.is_group_owner(group_id, auth.uid())
  or public.owns_shareable_resource(resource_type::text, resource_id, auth.uid())
);

drop policy if exists "resource_shares_insert_resource_owner" on public.resource_shares;
create policy "resource_shares_insert_resource_owner" on public.resource_shares
for insert to authenticated
with check (
  created_by = auth.uid()
  and public.owns_shareable_resource(resource_type::text, resource_id, auth.uid())
  and public.is_group_owner(group_id, auth.uid())
);

drop policy if exists "resource_shares_update_resource_owner" on public.resource_shares;
create policy "resource_shares_update_resource_owner" on public.resource_shares
for update to authenticated
using (public.owns_shareable_resource(resource_type::text, resource_id, auth.uid()))
with check (
  public.owns_shareable_resource(resource_type::text, resource_id, auth.uid())
  and public.is_group_owner(group_id, auth.uid())
);

drop policy if exists "resource_shares_delete_resource_owner" on public.resource_shares;
create policy "resource_shares_delete_resource_owner" on public.resource_shares
for delete to authenticated
using (public.owns_shareable_resource(resource_type::text, resource_id, auth.uid()));

drop policy if exists "sync_events_select_own" on public.sync_events;
create policy "sync_events_select_own" on public.sync_events
for select to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "sync_events_insert_own" on public.sync_events;
create policy "sync_events_insert_own" on public.sync_events
for insert to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists "sync_events_update_own" on public.sync_events;
create policy "sync_events_update_own" on public.sync_events
for update to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "sync_events_delete_own" on public.sync_events;
create policy "sync_events_delete_own" on public.sync_events
for delete to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "embedding_jobs_select_own" on public.embedding_jobs;
create policy "embedding_jobs_select_own" on public.embedding_jobs
for select to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "embedding_jobs_insert_own" on public.embedding_jobs;
create policy "embedding_jobs_insert_own" on public.embedding_jobs
for insert to authenticated
with check (owner_user_id = auth.uid() and public.can_write_note(note_id, auth.uid()));

drop policy if exists "embedding_jobs_update_own" on public.embedding_jobs;
create policy "embedding_jobs_update_own" on public.embedding_jobs
for update to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "embedding_jobs_delete_own" on public.embedding_jobs;
create policy "embedding_jobs_delete_own" on public.embedding_jobs
for delete to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "note_chunks_select_accessible" on public.note_chunks;
create policy "note_chunks_select_accessible" on public.note_chunks
for select to authenticated
using (public.can_read_note(note_id, auth.uid()));

drop policy if exists "note_chunks_insert_accessible" on public.note_chunks;
create policy "note_chunks_insert_accessible" on public.note_chunks
for insert to authenticated
with check (owner_user_id = auth.uid() and public.can_write_note(note_id, auth.uid()));

drop policy if exists "note_chunks_update_accessible" on public.note_chunks;
create policy "note_chunks_update_accessible" on public.note_chunks
for update to authenticated
using (public.can_write_note(note_id, auth.uid()));

drop policy if exists "note_chunks_delete_accessible" on public.note_chunks;
create policy "note_chunks_delete_accessible" on public.note_chunks
for delete to authenticated
using (public.can_write_note(note_id, auth.uid()));

drop policy if exists "note_embeddings_select_accessible" on public.note_embeddings;
create policy "note_embeddings_select_accessible" on public.note_embeddings
for select to authenticated
using (
  exists (
    select 1
    from public.note_chunks nc
    where nc.id = note_embeddings.chunk_id
      and public.can_read_note(nc.note_id, auth.uid())
  )
);

drop policy if exists "note_embeddings_insert_accessible" on public.note_embeddings;
create policy "note_embeddings_insert_accessible" on public.note_embeddings
for insert to authenticated
with check (
  owner_user_id = auth.uid()
  and exists (
    select 1
    from public.note_chunks nc
    where nc.id = note_embeddings.chunk_id
      and public.can_write_note(nc.note_id, auth.uid())
  )
);

drop policy if exists "note_embeddings_update_accessible" on public.note_embeddings;
create policy "note_embeddings_update_accessible" on public.note_embeddings
for update to authenticated
using (
  exists (
    select 1
    from public.note_chunks nc
    where nc.id = note_embeddings.chunk_id
      and public.can_write_note(nc.note_id, auth.uid())
  )
);

drop policy if exists "note_embeddings_delete_accessible" on public.note_embeddings;
create policy "note_embeddings_delete_accessible" on public.note_embeddings
for delete to authenticated
using (
  exists (
    select 1
    from public.note_chunks nc
    where nc.id = note_embeddings.chunk_id
      and public.can_write_note(nc.note_id, auth.uid())
  )
);

drop policy if exists "api_keys_select_own" on public.api_keys;
create policy "api_keys_select_own" on public.api_keys
for select to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "api_keys_insert_own" on public.api_keys;
create policy "api_keys_insert_own" on public.api_keys
for insert to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists "api_keys_update_own" on public.api_keys;
create policy "api_keys_update_own" on public.api_keys
for update to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "api_keys_delete_own" on public.api_keys;
create policy "api_keys_delete_own" on public.api_keys
for delete to authenticated
using (owner_user_id = auth.uid());
