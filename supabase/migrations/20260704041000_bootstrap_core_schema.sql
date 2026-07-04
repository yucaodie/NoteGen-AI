create extension if not exists pgcrypto;
create extension if not exists vector;

create type public.group_role as enum ('owner', 'member');
create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
create type public.share_permission as enum ('read', 'write');
create type public.share_resource_type as enum ('knowledge_base', 'folder');
create type public.sync_resource_type as enum ('knowledge_base', 'folder', 'note');
create type public.sync_operation as enum ('upsert', 'delete');
create type public.sync_status as enum ('synced', 'pending', 'conflict', 'failed');
create type public.embedding_job_status as enum ('pending', 'processing', 'succeeded', 'failed', 'skipped');
create type public.api_key_scope_type as enum ('user', 'group');
create type public.api_key_status as enum ('active', 'revoked');

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

create table public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  default_workspace_id uuid null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.knowledge_bases (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 255),
  description text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz null
);

create table public.folders (
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

create table public.notes (
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

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 255),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  inviter_user_id uuid not null references auth.users (id) on delete cascade,
  invitee_email text not null,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.group_role not null default 'member',
  joined_at timestamptz not null default timezone('utc', now()),
  unique (group_id, user_id)
);

create table public.resource_shares (
  id uuid primary key default gen_random_uuid(),
  resource_type public.share_resource_type not null,
  resource_id uuid not null,
  group_id uuid not null references public.groups (id) on delete cascade,
  permission public.share_permission not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (resource_type, resource_id, group_id)
);

create table public.sync_events (
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

create table public.embedding_jobs (
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

create table public.note_chunks (
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

create table public.note_embeddings (
  chunk_id uuid primary key references public.note_chunks (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  embedding vector(1536) not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.api_keys (
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

alter table public.user_profiles
  add constraint user_profiles_default_workspace_fk
  foreign key (default_workspace_id)
  references public.knowledge_bases (id)
  on delete set null;

create index knowledge_bases_owner_idx on public.knowledge_bases (owner_user_id);
create index folders_owner_idx on public.folders (owner_user_id);
create index folders_knowledge_base_idx on public.folders (knowledge_base_id);
create index folders_parent_idx on public.folders (parent_folder_id);
create index notes_owner_idx on public.notes (owner_user_id);
create index notes_knowledge_base_idx on public.notes (knowledge_base_id);
create index notes_folder_idx on public.notes (folder_id);
create index groups_owner_idx on public.groups (owner_user_id);
create index group_invitations_group_idx on public.group_invitations (group_id);
create index group_invitations_email_idx on public.group_invitations (lower(invitee_email));
create index group_members_group_idx on public.group_members (group_id);
create index group_members_user_idx on public.group_members (user_id);
create index resource_shares_group_idx on public.resource_shares (group_id);
create index resource_shares_lookup_idx on public.resource_shares (resource_type, resource_id);
create index sync_events_owner_idx on public.sync_events (owner_user_id, created_at desc);
create index embedding_jobs_note_idx on public.embedding_jobs (note_id, status);
create index note_chunks_note_idx on public.note_chunks (note_id, chunk_index);
create index note_embeddings_owner_idx on public.note_embeddings (owner_user_id);
create index api_keys_owner_idx on public.api_keys (owner_user_id, status);

create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

create trigger set_knowledge_bases_updated_at
before update on public.knowledge_bases
for each row
execute function public.set_updated_at();

create trigger set_folders_updated_at
before update on public.folders
for each row
execute function public.set_updated_at();

create trigger set_notes_updated_at
before update on public.notes
for each row
execute function public.set_updated_at();

create trigger set_groups_updated_at
before update on public.groups
for each row
execute function public.set_updated_at();

create trigger set_group_invitations_updated_at
before update on public.group_invitations
for each row
execute function public.set_updated_at();

create trigger set_embedding_jobs_updated_at
before update on public.embedding_jobs
for each row
execute function public.set_updated_at();

create trigger lock_knowledge_bases_owner_user_id
before update on public.knowledge_bases
for each row
execute function public.lock_owner_user_id();

create trigger lock_folders_owner_user_id
before update on public.folders
for each row
execute function public.lock_owner_user_id();

create trigger lock_notes_owner_user_id
before update on public.notes
for each row
execute function public.lock_owner_user_id();

create trigger lock_groups_owner_user_id
before update on public.groups
for each row
execute function public.lock_owner_user_id();

create trigger lock_sync_events_owner_user_id
before update on public.sync_events
for each row
execute function public.lock_owner_user_id();

create trigger lock_embedding_jobs_owner_user_id
before update on public.embedding_jobs
for each row
execute function public.lock_owner_user_id();

create trigger lock_note_chunks_owner_user_id
before update on public.note_chunks
for each row
execute function public.lock_owner_user_id();

create trigger lock_note_embeddings_owner_user_id
before update on public.note_embeddings
for each row
execute function public.lock_owner_user_id();

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
  target_resource_type public.share_resource_type,
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
  target_resource_type public.share_resource_type,
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
    where rs.resource_type = target_resource_type
      and rs.resource_id = target_resource_id
      and gm.user_id = coalesce(target_user_id, auth.uid())
  );
$$;

create or replace function public.can_write_shared_resource(
  target_resource_type public.share_resource_type,
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
    where rs.resource_type = target_resource_type
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
        or public.can_read_shared_resource('knowledge_base', kb.id, coalesce(target_user_id, auth.uid()))
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
        or public.can_write_shared_resource('knowledge_base', kb.id, coalesce(target_user_id, auth.uid()))
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
        or public.can_read_shared_resource('folder', f.id, coalesce(target_user_id, auth.uid()))
        or public.can_read_shared_resource('knowledge_base', f.knowledge_base_id, coalesce(target_user_id, auth.uid()))
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
        or public.can_write_shared_resource('folder', f.id, coalesce(target_user_id, auth.uid()))
        or public.can_write_shared_resource('knowledge_base', f.knowledge_base_id, coalesce(target_user_id, auth.uid()))
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

create policy "user_profiles_select_own" on public.user_profiles
for select to authenticated
using (user_id = auth.uid());

create policy "user_profiles_insert_own" on public.user_profiles
for insert to authenticated
with check (user_id = auth.uid());

create policy "user_profiles_update_own" on public.user_profiles
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "knowledge_bases_select_accessible" on public.knowledge_bases
for select to authenticated
using (public.can_read_knowledge_base(id, auth.uid()));

create policy "knowledge_bases_insert_own" on public.knowledge_bases
for insert to authenticated
with check (owner_user_id = auth.uid());

create policy "knowledge_bases_update_accessible" on public.knowledge_bases
for update to authenticated
using (public.can_write_knowledge_base(id, auth.uid()));

create policy "knowledge_bases_delete_accessible" on public.knowledge_bases
for delete to authenticated
using (public.can_write_knowledge_base(id, auth.uid()));

create policy "folders_select_accessible" on public.folders
for select to authenticated
using (public.can_read_folder(id, auth.uid()));

create policy "folders_insert_accessible" on public.folders
for insert to authenticated
with check (
  owner_user_id = auth.uid()
  and public.can_write_knowledge_base(knowledge_base_id, auth.uid())
  and (parent_folder_id is null or public.can_write_folder(parent_folder_id, auth.uid()))
);

create policy "folders_update_accessible" on public.folders
for update to authenticated
using (public.can_write_folder(id, auth.uid()))
with check (
  public.can_write_knowledge_base(knowledge_base_id, auth.uid())
  and (parent_folder_id is null or public.can_write_folder(parent_folder_id, auth.uid()))
);

create policy "folders_delete_accessible" on public.folders
for delete to authenticated
using (public.can_write_folder(id, auth.uid()));

create policy "notes_select_accessible" on public.notes
for select to authenticated
using (public.can_read_note(id, auth.uid()));

create policy "notes_insert_accessible" on public.notes
for insert to authenticated
with check (
  owner_user_id = auth.uid()
  and public.can_write_knowledge_base(knowledge_base_id, auth.uid())
  and (folder_id is null or public.can_write_folder(folder_id, auth.uid()))
);

create policy "notes_update_accessible" on public.notes
for update to authenticated
using (public.can_write_note(id, auth.uid()))
with check (
  public.can_write_knowledge_base(knowledge_base_id, auth.uid())
  and (folder_id is null or public.can_write_folder(folder_id, auth.uid()))
);

create policy "notes_delete_accessible" on public.notes
for delete to authenticated
using (public.can_write_note(id, auth.uid()));

create policy "groups_select_member_or_owner" on public.groups
for select to authenticated
using (
  owner_user_id = auth.uid()
  or public.is_group_member(id, auth.uid())
);

create policy "groups_insert_owner" on public.groups
for insert to authenticated
with check (owner_user_id = auth.uid());

create policy "groups_update_owner" on public.groups
for update to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "groups_delete_owner" on public.groups
for delete to authenticated
using (owner_user_id = auth.uid());

create policy "group_invitations_select_visible" on public.group_invitations
for select to authenticated
using (
  public.is_group_owner(group_id, auth.uid())
  or inviter_user_id = auth.uid()
  or lower(invitee_email) = public.current_user_email()
);

create policy "group_invitations_insert_group_owner" on public.group_invitations
for insert to authenticated
with check (
  inviter_user_id = auth.uid()
  and public.is_group_owner(group_id, auth.uid())
);

create policy "group_invitations_update_visible" on public.group_invitations
for update to authenticated
using (
  public.is_group_owner(group_id, auth.uid())
  or lower(invitee_email) = public.current_user_email()
);

create policy "group_invitations_delete_group_owner" on public.group_invitations
for delete to authenticated
using (public.is_group_owner(group_id, auth.uid()));

create policy "group_members_select_group_members" on public.group_members
for select to authenticated
using (
  user_id = auth.uid()
  or public.is_group_member(group_id, auth.uid())
  or public.is_group_owner(group_id, auth.uid())
);

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

create policy "group_members_update_group_owner" on public.group_members
for update to authenticated
using (public.is_group_owner(group_id, auth.uid()));

create policy "group_members_delete_owner_or_self" on public.group_members
for delete to authenticated
using (
  public.is_group_owner(group_id, auth.uid())
  or user_id = auth.uid()
);

create policy "resource_shares_select_visible" on public.resource_shares
for select to authenticated
using (
  public.is_group_member(group_id, auth.uid())
  or public.is_group_owner(group_id, auth.uid())
  or public.owns_shareable_resource(resource_type, resource_id, auth.uid())
);

create policy "resource_shares_insert_resource_owner" on public.resource_shares
for insert to authenticated
with check (
  created_by = auth.uid()
  and public.owns_shareable_resource(resource_type, resource_id, auth.uid())
  and public.is_group_owner(group_id, auth.uid())
);

create policy "resource_shares_update_resource_owner" on public.resource_shares
for update to authenticated
using (public.owns_shareable_resource(resource_type, resource_id, auth.uid()))
with check (
  public.owns_shareable_resource(resource_type, resource_id, auth.uid())
  and public.is_group_owner(group_id, auth.uid())
);

create policy "resource_shares_delete_resource_owner" on public.resource_shares
for delete to authenticated
using (public.owns_shareable_resource(resource_type, resource_id, auth.uid()));

create policy "sync_events_select_own" on public.sync_events
for select to authenticated
using (owner_user_id = auth.uid());

create policy "sync_events_insert_own" on public.sync_events
for insert to authenticated
with check (owner_user_id = auth.uid());

create policy "sync_events_update_own" on public.sync_events
for update to authenticated
using (owner_user_id = auth.uid());

create policy "sync_events_delete_own" on public.sync_events
for delete to authenticated
using (owner_user_id = auth.uid());

create policy "embedding_jobs_select_own" on public.embedding_jobs
for select to authenticated
using (owner_user_id = auth.uid());

create policy "embedding_jobs_insert_own" on public.embedding_jobs
for insert to authenticated
with check (owner_user_id = auth.uid() and public.can_write_note(note_id, auth.uid()));

create policy "embedding_jobs_update_own" on public.embedding_jobs
for update to authenticated
using (owner_user_id = auth.uid());

create policy "embedding_jobs_delete_own" on public.embedding_jobs
for delete to authenticated
using (owner_user_id = auth.uid());

create policy "note_chunks_select_accessible" on public.note_chunks
for select to authenticated
using (public.can_read_note(note_id, auth.uid()));

create policy "note_chunks_insert_accessible" on public.note_chunks
for insert to authenticated
with check (owner_user_id = auth.uid() and public.can_write_note(note_id, auth.uid()));

create policy "note_chunks_update_accessible" on public.note_chunks
for update to authenticated
using (public.can_write_note(note_id, auth.uid()));

create policy "note_chunks_delete_accessible" on public.note_chunks
for delete to authenticated
using (public.can_write_note(note_id, auth.uid()));

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

create policy "api_keys_select_own" on public.api_keys
for select to authenticated
using (owner_user_id = auth.uid());

create policy "api_keys_insert_own" on public.api_keys
for insert to authenticated
with check (owner_user_id = auth.uid());

create policy "api_keys_update_own" on public.api_keys
for update to authenticated
using (owner_user_id = auth.uid());

create policy "api_keys_delete_own" on public.api_keys
for delete to authenticated
using (owner_user_id = auth.uid());
