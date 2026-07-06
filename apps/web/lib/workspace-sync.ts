import type { ConflictRecord, SyncMetadata } from '@supanotegen/shared';

export function countPendingSyncItems(syncMetadataMap: Record<string, SyncMetadata>) {
  return Object.values(syncMetadataMap).filter((item) => item.syncStatus === 'pending').length;
}

export function formatSyncStatus(status: SyncMetadata['syncStatus']) {
  switch (status) {
    case 'synced':
      return '已同步';
    case 'pending':
      return '待同步';
    case 'conflict':
      return '有冲突';
    case 'failed':
      return '同步失败';
  }
}

export function describeConflict(record: ConflictRecord, activeNoteId: string | null) {
  const scopeLabel = record.resourceType === 'note' ? '笔记' : record.resourceType === 'folder' ? '文件夹' : '知识库';
  const focusLabel = record.resourceId === activeNoteId ? '当前正在编辑' : '等待处理';
  return `${scopeLabel}冲突 · 本地 ${record.localVersion} / 云端 ${record.cloudVersion} · ${focusLabel}`;
}
