import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = join(
  process.cwd(),
  '..',
  '..',
  'supabase',
  'migrations',
  '20260704041000_bootstrap_core_schema.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

describe('bootstrap core schema migration', () => {
  it('creates all required core tables', () => {
    const requiredTables = [
      'user_profiles',
      'knowledge_bases',
      'folders',
      'notes',
      'groups',
      'group_invitations',
      'group_members',
      'resource_shares',
      'sync_events',
      'embedding_jobs',
      'note_chunks',
      'note_embeddings',
      'api_keys',
    ];

    for (const tableName of requiredTables) {
      expect(migrationSql).toContain(`create table if not exists public.${tableName}`);
    }
  });

  it('can be rerun against partially bootstrapped databases', () => {
    const requiredFragments = [
      'create extension if not exists pgcrypto;',
      'create extension if not exists vector;',
      "exception when duplicate_object then null;",
      'alter table public.embedding_jobs add column if not exists owner_user_id',
      'alter table public.user_profiles\n    add constraint user_profiles_default_workspace_fk',
      'create unique index if not exists group_members_group_user_uidx',
      'drop trigger if exists set_user_profiles_updated_at on public.user_profiles;',
      'drop policy if exists "notes_select_accessible" on public.notes;',
    ];

    for (const fragment of requiredFragments) {
      expect(migrationSql).toContain(fragment);
    }
  });

  it('enables and forces row level security on protected tables', () => {
    const protectedTables = [
      'knowledge_bases',
      'folders',
      'notes',
      'groups',
      'group_invitations',
      'group_members',
      'resource_shares',
      'sync_events',
      'embedding_jobs',
      'note_chunks',
      'note_embeddings',
      'api_keys',
    ];

    for (const tableName of protectedTables) {
      expect(migrationSql).toContain(`alter table public.${tableName} enable row level security;`);
      expect(migrationSql).toContain(`alter table public.${tableName} force row level security;`);
    }
  });

  it('defines shared access helper functions and policies', () => {
    const requiredFragments = [
      'create or replace function public.can_read_shared_resource',
      'create or replace function public.can_write_shared_resource',
      'create or replace function public.can_read_knowledge_base',
      'create or replace function public.can_write_knowledge_base',
      'create or replace function public.can_read_folder',
      'create or replace function public.can_write_folder',
      'create or replace function public.can_read_note',
      'create or replace function public.can_write_note',
      'create policy "resource_shares_insert_resource_owner"',
      'create policy "notes_select_accessible"',
      'create policy "note_chunks_select_accessible"',
      'create policy "note_embeddings_select_accessible"',
    ];

    for (const fragment of requiredFragments) {
      expect(migrationSql).toContain(fragment);
    }
  });
});
