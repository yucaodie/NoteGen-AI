'use client';

import { useEffect, useState, useTransition } from 'react';
import type { Group, KnowledgeBase, ResourceShare } from '@supanotegen/shared';
import type { AuthSession } from '@supanotegen/shared';
import { createResourceShare, listGroups, listResourceShares, updateResourceShare } from '../lib/collaboration';

type ShareSectionProps = {
  session: AuthSession;
  knowledgeBases: KnowledgeBase[];
  readOnly: boolean;
  onMessage: (message: string) => void;
};

export function ShareSection({ session, knowledgeBases, readOnly, onMessage }: ShareSectionProps) {
  const [shares, setShares] = useState<ResourceShare[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedResourceType, setSelectedResourceType] = useState<'knowledge_base' | 'folder'>('knowledge_base');
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<'read' | 'write'>('read');
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (loaded) return;
    setLoaded(true);

    startTransition(async () => {
      try {
        const [ownedShares, userGroups] = await Promise.all([
          listResourceShares(session, 'owned'),
          listGroups(session),
        ]);
        setShares(ownedShares);
        setGroups(userGroups);
      } catch (error) {
        onMessage(error instanceof Error ? error.message : '加载共享关系失败。');
      }
    });
  }, [loaded, onMessage, session]);

  function handleCreateShare() {
    if (!selectedResourceId || !selectedGroupId) return;
    startTransition(async () => {
      try {
        const share = await createResourceShare(session, {
          resourceType: selectedResourceType,
          resourceId: selectedResourceId,
          groupId: selectedGroupId,
          permission: selectedPermission,
        });
        setShares((prev) => [...prev, share]);
        onMessage('共享关系创建成功。');
      } catch (error) {
        onMessage(error instanceof Error ? error.message : '创建共享失败。');
      }
    });
  }

  function handleUpdatePermission(shareId: string, permission: 'read' | 'write') {
    startTransition(async () => {
      try {
        const updated = await updateResourceShare(session, shareId, { permission });
        setShares((prev) => prev.map((s) => (s.id === shareId ? updated : s)));
        onMessage('权限已更新。');
      } catch (error) {
        onMessage(error instanceof Error ? error.message : '更新权限失败。');
      }
    });
  }

  function getResourceName(resourceType: string, resourceId: string) {
    if (resourceType === 'knowledge_base') {
      const kb = knowledgeBases.find((k) => k.id === resourceId);
      return kb ? kb.name : resourceId.slice(0, 8) + '...';
    }
    return resourceId.slice(0, 8) + '...';
  }

  function getGroupName(groupId: string) {
    const group = groups.find((g) => g.id === groupId);
    return group ? group.name : groupId.slice(0, 8) + '...';
  }

  return (
    <div className="collaboration-panels">
      <article className="panel-card">
        <h2 className="panel-title">共享资源</h2>
        <ul className="workspace-list">
          {shares.map((share) => (
            <li key={share.id}>
              <div className="workspace-item">
                <strong>
                  {share.resourceType === 'knowledge_base' ? '知识库' : '文件夹'}：{getResourceName(share.resourceType, share.resourceId)}
                </strong>
                <span className="status-note">
                  群组：{getGroupName(share.groupId)} · 权限：{share.permission === 'read' ? '只读' : '读写'}
                </span>
                {!readOnly && groups.find((g) => g.id === share.groupId)?.ownerUserId === session.user.id ? (
                  <div className="cta-row compact-actions">
                    {share.permission === 'read' ? (
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={isPending}
                        onClick={() => handleUpdatePermission(share.id, 'write')}
                      >
                        设为读写
                      </button>
                    ) : (
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={isPending}
                        onClick={() => handleUpdatePermission(share.id, 'read')}
                      >
                        设为只读
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
          {shares.length === 0 && <li className="status-note">没有已创建的共享关系。</li>}
        </ul>
      </article>

      {!readOnly && knowledgeBases.length > 0 ? (
        <article className="panel-card">
          <h2 className="panel-title">创建共享</h2>
          <div className="input-column">
            <label className="field-label">
              资源类型
              <select
                className="select-input"
                value={selectedResourceType}
                onChange={(e) => {
                  setSelectedResourceType(e.target.value as 'knowledge_base' | 'folder');
                  setSelectedResourceId('');
                }}
              >
                <option value="knowledge_base">知识库</option>
                <option value="folder">文件夹</option>
              </select>
            </label>
            <label className="field-label">
              {selectedResourceType === 'knowledge_base' ? '知识库' : '文件夹'}
              <select
                className="select-input"
                value={selectedResourceId}
                onChange={(e) => setSelectedResourceId(e.target.value)}
              >
                <option value="">请选择</option>
                {selectedResourceType === 'knowledge_base'
                  ? knowledgeBases.map((kb) => (
                      <option key={kb.id} value={kb.id}>
                        {kb.name}
                      </option>
                    ))
                  : null}
              </select>
            </label>
            <label className="field-label">
              目标群组
              <select
                className="select-input"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                <option value="">请选择</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              权限级别
              <select
                className="select-input"
                value={selectedPermission}
                onChange={(e) => setSelectedPermission(e.target.value as 'read' | 'write')}
              >
                <option value="read">只读</option>
                <option value="write">读写</option>
              </select>
            </label>
            <button
              className="primary-button"
              type="button"
              disabled={isPending || !selectedResourceId || !selectedGroupId}
              onClick={handleCreateShare}
            >
              创建共享
            </button>
          </div>
        </article>
      ) : null}
    </div>
  );
}
