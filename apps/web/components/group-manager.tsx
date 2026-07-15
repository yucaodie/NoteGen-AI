'use client';

import { useEffect, useState, useTransition } from 'react';
import type { Group, GroupInvitation } from '@supanotegen/shared';
import type { AuthSession } from '@supanotegen/shared';
import {
  acceptInvitation,
  createGroup,
  createGroupInvitation,
  type GroupDetail,
  getGroup,
  listGroups,
  listGroupInvitations,
  listPendingInvitations,
} from '../lib/collaboration';

type GroupManagerProps = {
  session: AuthSession;
  readOnly: boolean;
  onMessage: (message: string) => void;
};

export function GroupManager({ session, readOnly, onMessage }: GroupManagerProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<GroupInvitation[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (loaded) return;
    setLoaded(true);

    startTransition(async () => {
      try {
        const [fetchedGroups, fetchedPending] = await Promise.all([
          listGroups(session),
          listPendingInvitations(session),
        ]);
        setGroups(fetchedGroups);
        setPendingInvitations(fetchedPending);
      } catch (error) {
        onMessage(error instanceof Error ? error.message : '加载群组列表失败。');
      }
    });
  }, [loaded, onMessage, session]);

  function handleSelectGroup(groupId: string) {
    startTransition(async () => {
      try {
        const detail = await getGroup(session, groupId);
        setSelectedGroup(detail);
        const invs = await listGroupInvitations(session, groupId);
        setInvitations(invs);
      } catch (error) {
        onMessage(error instanceof Error ? error.message : '加载群组详情失败。');
      }
    });
  }

  function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    startTransition(async () => {
      try {
        const group = await createGroup(session, { name: newGroupName.trim() });
        setGroups((prev) => [...prev, group]);
        setNewGroupName('');
        onMessage('群组创建成功。');
      } catch (error) {
        onMessage(error instanceof Error ? error.message : '创建群组失败。');
      }
    });
  }

  function handleInvite() {
    if (!inviteEmail.trim() || !selectedGroup) return;
    startTransition(async () => {
      try {
        const invite = await createGroupInvitation(session, selectedGroup.id, {
          inviteeEmail: inviteEmail.trim(),
        });
        setInvitations((prev) => [...prev, invite]);
        setInviteEmail('');
        onMessage('邀请已发送。');
      } catch (error) {
        onMessage(error instanceof Error ? error.message : '发送邀请失败。');
      }
    });
  }

  function handleAcceptInvite(invitationId: string) {
    startTransition(async () => {
      try {
        await acceptInvitation(session, invitationId);
        setPendingInvitations((prev) => prev.filter((i) => i.id !== invitationId));
        const [fetchedGroups] = await Promise.all([listGroups(session)]);
        setGroups(fetchedGroups);
        onMessage('已加入群组。');
      } catch (error) {
        onMessage(error instanceof Error ? error.message : '接受邀请失败。');
      }
    });
  }

  return (
    <div className="collaboration-panels">
      <article className="panel-card">
        <h2 className="panel-title">群组管理</h2>
        {!readOnly ? (
          <div className="input-row">
            <input
              className="text-input"
              placeholder="群组名称"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateGroup();
              }}
            />
            <button
              className="primary-button"
              type="button"
              disabled={isPending || !newGroupName.trim()}
              onClick={handleCreateGroup}
            >
              创建群组
            </button>
          </div>
        ) : null}
        <ul className="workspace-list">
          {groups.map((group) => (
            <li key={group.id}>
              <button
                className={selectedGroup?.id === group.id ? 'workspace-item active' : 'workspace-item'}
                type="button"
                onClick={() => handleSelectGroup(group.id)}
              >
                <strong>{group.name}</strong>
                <span className="status-note">
                  {group.ownerUserId === session.user.id ? '群主' : '成员'}
                </span>
              </button>
            </li>
          ))}
          {groups.length === 0 && <li className="status-note">尚未加入任何群组。</li>}
        </ul>
      </article>

      <article className="panel-card">
        <h2 className="panel-title">待处理邀请</h2>
        <ul className="workspace-list">
          {pendingInvitations.map((inv) => (
            <li key={inv.id}>
              <div className="workspace-item">
                <strong>群组 {inv.groupId.slice(0, 8)}...</strong>
                <span className="status-note">邀请人：{inv.inviterUserId.slice(0, 8)}...</span>
                <span className="status-note">
                  过期时间：{new Date(inv.expiresAt).toLocaleString('zh-CN')}
                </span>
                {!readOnly ? (
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={isPending}
                    onClick={() => handleAcceptInvite(inv.id)}
                  >
                    接受邀请
                  </button>
                ) : null}
              </div>
            </li>
          ))}
          {pendingInvitations.length === 0 && <li className="status-note">没有待处理的邀请。</li>}
        </ul>
      </article>

      {selectedGroup ? (
        <article className="panel-card">
          <h2 className="panel-title">
            {selectedGroup.name} - 成员
          </h2>
          <ul className="workspace-list">
            {selectedGroup.members.map((m) => (
              <li key={m.groupId + '-' + m.groupId}>
                <div className="workspace-item">
                  <strong>{m.groupId.slice(0, 8)}...</strong>
                  <span className="status-note">
                    {m.role === 'owner' ? '群主' : '成员'}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {selectedGroup.ownerUserId === session.user.id && !readOnly ? (
            <div>
              <h3 className="panel-title">发送邀请</h3>
              <div className="input-row">
                <input
                  className="text-input"
                  placeholder="成员邮箱"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInvite();
                  }}
                />
                <button
                  className="primary-button"
                  type="button"
                  disabled={isPending || !inviteEmail.trim()}
                  onClick={handleInvite}
                >
                  发送邀请
                </button>
              </div>
              <h3 className="panel-title">已发送邀请</h3>
              <ul className="workspace-list">
                {invitations.map((inv) => (
                  <li key={inv.id}>
                    <div className="workspace-item">
                      <strong>{inv.inviteeEmail}</strong>
                      <span className="status-note">状态：{inv.status}</span>
                    </div>
                  </li>
                ))}
                {invitations.length === 0 && <li className="status-note">没有待接受的邀请。</li>}
              </ul>
            </div>
          ) : null}
        </article>
      ) : null}
    </div>
  );
}
