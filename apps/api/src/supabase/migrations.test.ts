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
      expect(migrationSql).toContain(`create table public.${tableName}`);
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
