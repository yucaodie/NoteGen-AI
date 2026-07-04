'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import type { AuthBootstrap } from '@supanotegen/shared';
import { recoverSession, signOut } from '../lib/auth';
import {
  clearStoredSession,
  loadStoredSession,
  loadStoredWorkspace,
  saveStoredSession,
  saveStoredWorkspace,
} from '../lib/auth-storage';
import { recoverWorkspaceSessionState, type WorkspaceRecoveryState } from '../lib/workspace-session';

export function WorkspaceShell() {
  const [state, setState] = useState<WorkspaceRecoveryState | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const storedSession = loadStoredSession();
    const cachedBootstrap = loadStoredWorkspace();

    void recoverWorkspaceSessionState({
      session: storedSession,
      cachedBootstrap,
      recoverOnline: recoverSession,
      persistBootstrap: (bootstrap) => {
        saveStoredSession(bootstrap.session);
        saveStoredWorkspace(bootstrap);
      },
      clearSession: () => {
        clearStoredSession();
      },
    }).then((nextState) => {
      if (!cancelled) {
        setState(nextState);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!state) {
    return (
      <main className="page-shell workspace-layout">
        <section className="hero-card">
          <p className="eyebrow">Workspace Shell</p>
          <h1 className="workspace-heading">正在恢复云端工作区</h1>
          <p className="workspace-subtitle hero-copy">正在校验认证会话并尝试拉取默认工作区。</p>
        </section>
      </main>
    );
  }

  if (state.kind === 'unauthenticated') {
    return (
      <main className="page-shell workspace-layout">
        <section className="hero-card">
          <p className="eyebrow">Workspace Shell</p>
          <h1 className="workspace-heading">知识工作区骨架</h1>
          <p className="workspace-subtitle hero-copy">{state.message}</p>
          <div className="cta-row">
            <Link className="primary-button" href="/auth">
              去登录
            </Link>
            <Link className="secondary-button" href="/">
              返回首页
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const bootstrap = state.bootstrap;

  return (
    <main className="page-shell workspace-layout">
      <section className="hero-card">
        <div className="workspace-header-row">
          <div>
            <p className="eyebrow">Workspace Shell</p>
            <h1 className="workspace-heading">知识工作区骨架</h1>
          </div>
          <button
            className="secondary-button"
            type="button"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                try {
                  await signOut(bootstrap.session);
                } catch {
                  // The client still clears local state to end the session flow.
                }

                clearStoredSession();
                setState({
                  kind: 'unauthenticated',
                  message: '你已退出登录。',
                });
              });
            }}
          >
            退出登录
          </button>
        </div>

        <p className="workspace-subtitle hero-copy">{state.message}</p>

        <div className="panel-grid workspace-panels">
          <article className="panel-card">
            <h2 className="panel-title">当前用户</h2>
            <p className="panel-copy">{bootstrap.session.user.email}</p>
            <p className="status-note">显示名：{bootstrap.workspace.profile.displayName}</p>
            <p className="status-note">模式：{bootstrap.workspace.mode}</p>
          </article>

          <article className="panel-card">
            <h2 className="panel-title">默认工作区</h2>
            <p className="panel-copy">{bootstrap.workspace.profile.defaultWorkspaceId ?? '尚未初始化'}</p>
            <p className="status-note">
              当前可访问知识域：{bootstrap.workspace.accessContext.knowledgeBaseIds.length} 个
            </p>
          </article>
        </div>
      </section>

      <section className="workspace-layout panel-grid" aria-label="知识库列表和访问上下文">
        <article className="panel-card">
          <h2 className="panel-title">知识库列表</h2>
          <ul className="metric-list">
            {bootstrap.workspace.knowledgeBases.map((knowledgeBase) => (
              <li className="metric-item" key={knowledgeBase.id}>
                <strong>{knowledgeBase.name}</strong>
                <span className="status-note">{knowledgeBase.description ?? '暂无描述'}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel-card">
          <h2 className="panel-title">访问上下文</h2>
          <p className="panel-copy">用户 ID：{bootstrap.workspace.accessContext.userId}</p>
          <p className="status-note">群组成员身份：{bootstrap.workspace.memberships.length} 个</p>
          <p className="status-note">离线只读回退已接入，会在会话过期或网络异常时启用。</p>
        </article>
      </section>
    </main>
  );
}
