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

export type KnowledgeBaseTree = {
  knowledgeBase: KnowledgeBase;
  folders: Folder[];
  notes: Note[];
};

export type Group = {
  id: string;
  ownerUserId: string;
  name: string;
};

export type GroupInvitation = {
  id: string;
  groupId: string;
  inviterUserId: string;
  inviteeEmail: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
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

export type UserProfile = {
  userId: string;
  displayName: string;
  defaultWorkspaceId: string | null;
};

export type GroupMembership = {
  groupId: string;
  role: 'owner' | 'member';
};

export type AccessContext = {
  userId: string;
  groupIds: string[];
  knowledgeBaseIds: string[];
};

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: AuthUser;
};

export type WorkspaceBootstrap = {
  profile: UserProfile;
  knowledgeBases: KnowledgeBase[];
  memberships: GroupMembership[];
  accessContext: AccessContext;
  mode: 'online' | 'offline-readonly';
};

export type AuthBootstrap = {
  session: AuthSession;
  workspace: WorkspaceBootstrap;
};

export type PendingEmailConfirmation = {
  status: 'pending_email_confirmation';
  email: string;
  message: string;
};

export type SignUpResult = AuthBootstrap | PendingEmailConfirmation;

export type ApiErrorCode =
  | 'auth_failed'
  | 'session_expired'
  | 'network_error'
  | 'invalid_request'
  | 'forbidden'
  | 'not_found'
  | 'conflict';

export type ApiErrorPayload = {
  code: ApiErrorCode;
  message: string;
};

export type ConflictRecord = {
  resourceId: string;
  resourceType: 'knowledge_base' | 'folder' | 'note';
  localVersion: number;
  cloudVersion: number;
  localContentHash: string;
  cloudContentHash: string;
  createdAt: string;
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

export type SyncEventRecord = {
  id: string;
  resourceId: string;
  resourceType: 'knowledge_base' | 'folder' | 'note';
  operation: 'upsert' | 'delete';
  localVersion: number;
  cloudVersion: number | null;
  status: 'synced' | 'pending' | 'conflict' | 'failed';
  payload: Record<string, unknown>;
  createdAt: string;
};
