export type WorkspaceSurface = 'web' | 'api';

export type AppDescriptor = {
  name: string;
  status: 'ok';
  surface: WorkspaceSurface;
};

export type KnowledgeBase = {
  id: string;
  ownerUserId: string;
  name: string;
  description: string | null;
};

export type Folder = {
  id: string;
  ownerUserId: string;
  knowledgeBaseId: string;
  parentFolderId: string | null;
  title: string;
  sortKey: string;
};

export type Note = {
  id: string;
  ownerUserId: string;
  knowledgeBaseId: string;
  folderId: string | null;
  title: string;
  markdownContent: string;
  contentHash: string;
  version: number;
};

export type Group = {
  id: string;
  ownerUserId: string;
  name: string;
};

export type ResourceShare = {
  id: string;
  resourceType: 'knowledge_base' | 'folder';
  resourceId: string;
  groupId: string;
  permission: 'read' | 'write';
};

export type ApiKey = {
  id: string;
  ownerUserId: string;
  scopeType: 'user' | 'group';
  scopeId: string | null;
  status: 'active' | 'revoked';
};

export type SyncMetadata = {
  resourceId: string;
  resourceType: 'knowledge_base' | 'folder' | 'note';
  localVersion: number;
  cloudVersion: number | null;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'failed';
  contentHash: string;
  lastSyncedAt: string | null;
  tombstone: boolean;
};
