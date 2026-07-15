'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import type { AuthBootstrap, ConflictRecord, KnowledgeBase, KnowledgeBaseTree, Note, SyncMetadata } from '@supanotegen/shared';
import { recoverSession, signOut } from '../lib/auth';
import {
  createFolder,
  createKnowledgeBase,
  createNote,
  createSyncEvent,
  getKnowledgeBaseTree,
  listSyncEvents,
  listKnowledgeBases,
  updateNote,
} from '../lib/content';
import {
  clearStoredSession,
  loadStoredSession,
  loadStoredWorkspace,
  saveStoredSession,
  saveStoredWorkspace,
} from '../lib/auth-storage';
import { clearDraft, loadDraft, saveDraft } from '../lib/draft-storage';
import { createSyncService, type SyncService, buildSyncContentHash } from '../lib/sync-service';
import {
  loadAllSyncMetadata,
  loadConflictRecords,
  loadSyncMetadata,
  removeConflictRecord,
  saveConflictRecord,
  saveSyncMetadata,
} from '../lib/sync-storage';
import { countPendingSyncItems, describeConflict, formatSyncStatus } from '../lib/workspace-sync';
import { buildNextTree, buildNextTreeWithFolder, getVisibleNotes, mergeNoteWithDraft, sortFolders } from '../lib/workspace-content';
import { recoverWorkspaceSessionState, type WorkspaceRecoveryState } from '../lib/workspace-session';
import { createRealtimeSyncSubscription } from '../lib/realtime-sync';
import { GroupManager } from './group-manager';
import { ShareSection } from './share-section';

type WorkspaceModule = 'writing' | 'records' | 'search' | 'sharing' | 'ai' | 'developer' | 'settings';

const workspaceModules: Array<{ id: WorkspaceModule; label: string; title: string }> = [
  { id: 'writing', label: '写作', title: '笔记写作' },
  { id: 'records', label: '记录', title: '快速记录' },
  { id: 'search', label: '搜索', title: '全文搜索' },
  { id: 'sharing', label: '共享', title: '群组共享' },
  { id: 'ai', label: 'AI', title: '知识问答' },
  { id: 'developer', label: '开发者', title: 'API Key 与 RAG 接口' },
  { id: 'settings', label: '设置', title: '工作区设置' },
];

function isRecordNote(note: Note) {
  return note.title.startsWith('记录') || note.title.startsWith('[记录]') || note.markdownContent.startsWith('> 记录');
}

export function WorkspaceShell() {
  const [state, setState] = useState<WorkspaceRecoveryState | null>(null);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [tree, setTree] = useState<KnowledgeBaseTree | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [activeModule, setActiveModule] = useState<WorkspaceModule>('writing');
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [syncMetadataMap, setSyncMetadataMap] = useState<Record<string, SyncMetadata>>({});
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [isPending, startTransition] = useTransition();
  const syncServiceRef = useRef<SyncService | null>(null);
  const sessionRef = useRef<AuthBootstrap['session'] | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const syncCursorRef = useRef<string | null>(null);
  const realtimeRefreshInFlightRef = useRef(false);

  useEffect(() => {
    setSyncMetadataMap(loadAllSyncMetadata());
    setConflicts(loadConflictRecords());

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

  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      return;
    }

    const channel = new BroadcastChannel('supanotegen-workspace-sync');
    broadcastRef.current = channel;

    channel.onmessage = (event) => {
      const payload = event.data as { type?: string; knowledgeBaseId?: string };
      if (payload.type !== 'note-synced' || !payload.knowledgeBaseId || !state || state.kind !== 'authenticated') {
        return;
      }

      if (payload.knowledgeBaseId === selectedKnowledgeBaseId) {
        void refreshKnowledgeBaseTree(state.bootstrap, payload.knowledgeBaseId, true);
      }
    };

    return () => {
      channel.close();
      broadcastRef.current = null;
    };
  }, [selectedKnowledgeBaseId, state]);

  useEffect(() => {
    if (typeof window === 'undefined' || !state || state.kind !== 'authenticated') {
      return;
    }

    return createRealtimeSyncSubscription({
      accessToken: state.bootstrap.session.accessToken,
      onKnowledgeBaseChange: (knowledgeBaseId) => {
        if (knowledgeBaseId !== selectedKnowledgeBaseId || realtimeRefreshInFlightRef.current) {
          return;
        }

        realtimeRefreshInFlightRef.current = true;
        void refreshKnowledgeBaseTree(state.bootstrap, knowledgeBaseId, true)
          .then(() => {
            setWorkspaceMessage('已接收云端实时变更。');
          })
          .catch((error) => {
            setWorkspaceMessage(error instanceof Error ? error.message : '实时同步刷新失败。');
          })
          .finally(() => {
            realtimeRefreshInFlightRef.current = false;
          });
      },
    });
  }, [selectedKnowledgeBaseId, state]);

  useEffect(() => {
    if (!state || state.kind === 'unauthenticated') {
      return;
    }

    const bootstrap = state.bootstrap;
    sessionRef.current = bootstrap.session;
    const bootstrapKnowledgeBases = bootstrap.workspace.knowledgeBases;
    setKnowledgeBases(bootstrapKnowledgeBases);

    if (state.kind === 'offline-readonly') {
      setSelectedKnowledgeBaseId(bootstrap.workspace.profile.defaultWorkspaceId ?? bootstrapKnowledgeBases[0]?.id ?? null);
      return;
    }

    let cancelled = false;

    void hydrateWorkspace(bootstrap).catch((error) => {
      if (!cancelled) {
        setWorkspaceMessage(error instanceof Error ? error.message : '工作区加载失败。');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [state]);

  useEffect(() => {
    if (!state || state.kind !== 'authenticated' || !selectedKnowledgeBaseId) {
      return;
    }

    let cancelled = false;

    void getKnowledgeBaseTree(state.bootstrap.session, selectedKnowledgeBaseId)
      .then((nextTree) => {
        if (cancelled) {
          return;
        }

        setTree(nextTree);
        setSelectedFolderId(null);
        const nextNote = getVisibleNotes(nextTree, null)[0] ?? null;
        if (nextNote) {
          const mergedNote = mergeNoteWithDraft(nextNote, loadDraft(nextNote.id));
          setSelectedNoteId(nextNote.id);
          setNoteTitle(mergedNote.title);
          setNoteContent(mergedNote.markdownContent);
        } else {
          setSelectedNoteId(null);
          setNoteTitle('');
          setNoteContent('');
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setWorkspaceMessage(error instanceof Error ? error.message : '知识库内容加载失败。');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedKnowledgeBaseId, state]);

  useEffect(() => {
    function handleOnline() {
      const session = sessionRef.current;
      if (!session) {
        return;
      }

      void getSyncService().retryPending().then(() => {
        setWorkspaceMessage('网络已恢复，正在重试待同步变更。');
      });
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible' || !state || state.kind !== 'authenticated' || !selectedKnowledgeBaseId) {
        return;
      }

      void refreshKnowledgeBaseTree(state.bootstrap, selectedKnowledgeBaseId)
        .then((changed) => {
          setWorkspaceMessage(changed ? '已刷新当前知识库的云端状态。' : '当前知识库没有新的云端变更。');
        })
        .catch((error) => {
          setWorkspaceMessage(error instanceof Error ? error.message : '刷新云端状态失败。');
        });
    }

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedKnowledgeBaseId, state]);

  if (!state) {
    return (
      <main className="page-shell workspace-layout">
        <section className="hero-card">
          <p className="eyebrow">SupaNoteGen Cloud</p>
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
          <p className="eyebrow">SupaNoteGen Cloud</p>
          <h1 className="workspace-heading">云端知识工作区</h1>
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
  const currentNote = selectedNoteId ? tree?.notes.find((note) => note.id === selectedNoteId) ?? null : null;
  const currentSyncMetadata = currentNote ? syncMetadataMap[currentNote.id] ?? null : null;
  const activeConflict = currentNote ? conflicts.find((record) => record.resourceId === currentNote.id) ?? null : null;
  const pendingSyncCount = countPendingSyncItems(syncMetadataMap);
  const visibleItems = tree ? getVisibleNotes(tree, selectedFolderId) : [];
  const visibleNotes = visibleItems.filter((note) => !isRecordNote(note));
  const visibleRecords = visibleItems.filter(isRecordNote);
  const activeList = activeModule === 'records' ? visibleRecords : visibleNotes;
  const visibleFolders = tree ? sortFolders(tree.folders) : [];
  const activeModuleLabel = workspaceModules.find((module) => module.id === activeModule)?.label ?? '写作';

  return (
    <main className="notegen-workspace">
      <header className="notegen-titlebar">
        <div className="notegen-window-title">
          <strong>SupaNoteGen</strong>
          <span>{workspaceMessage ?? state.message}</span>
        </div>
        <div className="notegen-quick-actions" aria-label="快速操作">
          {state.kind === 'authenticated' ? (
            <>
              <button
                className="icon-button"
                type="button"
                aria-label="新建知识库"
                title="新建知识库"
                disabled={isPending}
                onClick={handleCreateKnowledgeBase}
              >
                新建知识库
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label="新建目录"
                title="新建文件夹"
                disabled={isPending || !selectedKnowledgeBaseId}
                onClick={handleCreateFolder}
              >
                新建目录
              </button>
              <button
                className="icon-button primary"
                type="button"
                aria-label="新建笔记"
                title="新建笔记"
                disabled={isPending || !selectedKnowledgeBaseId}
                onClick={() => handleCreateNote('note')}
              >
                新建笔记
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label="新建记录"
                title="新建记录"
                disabled={isPending || !selectedKnowledgeBaseId}
                onClick={() => handleCreateNote('record')}
              >
                新建记录
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label="刷新同步"
                title="刷新同步"
                disabled={isPending || !selectedKnowledgeBaseId}
                onClick={handleRefreshCurrentKnowledgeBase}
              >
                刷新同步
              </button>
            </>
          ) : null}
        </div>
        <button
          className="notegen-text-button"
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
          退出
        </button>
      </header>

      <div className="notegen-shell">
        <nav className="notegen-rail" aria-label="主导航">
          {workspaceModules.map((module) => (
            <button
              key={module.id}
              className={activeModule === module.id ? 'rail-button active' : 'rail-button'}
              type="button"
              title={module.title}
              aria-label={module.title}
              aria-pressed={activeModule === module.id}
              onClick={() => setActiveModule(module.id)}
            >
              {module.label}
            </button>
          ))}
          <button className="rail-button rail-bottom" type="button" title={bootstrap.session.user.email}>
            用户
          </button>
        </nav>

        <aside className="notegen-left-pane" aria-label="文件和记录">
          <div className="pane-tabs" role="tablist" aria-label="资源视图">
            <button
              className={activeModule === 'writing' ? 'pane-tab active' : 'pane-tab'}
              type="button"
              onClick={() => setActiveModule('writing')}
            >
              笔记
            </button>
            <button
              className={activeModule === 'records' ? 'pane-tab active' : 'pane-tab'}
              type="button"
              onClick={() => setActiveModule('records')}
            >
              记录
            </button>
          </div>

          <section className="pane-section">
            <h2>知识库</h2>
            <ul className="workspace-list compact-list">
              {knowledgeBases.map((knowledgeBase) => (
                <li key={knowledgeBase.id}>
                  <button
                    className={knowledgeBase.id === selectedKnowledgeBaseId ? 'workspace-item active' : 'workspace-item'}
                    type="button"
                    onClick={() => {
                      setSelectedKnowledgeBaseId(knowledgeBase.id);
                      setSelectedFolderId(null);
                      setSelectedNoteId(null);
                    }}
                  >
                    <strong>{knowledgeBase.name}</strong>
                    <span>{knowledgeBase.description ?? '暂无描述'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="pane-section">
            <h2>目录树</h2>
            <ul className="workspace-list compact-list">
              <li>
                <button
                  className={selectedFolderId === null ? 'workspace-item active' : 'workspace-item'}
                  type="button"
                  onClick={() => setSelectedFolderId(null)}
                  >
                    <strong>全部笔记</strong>
                    <span>{visibleItems.length} 条内容</span>
                  </button>
                </li>
              {visibleFolders.map((folder) => (
                <li key={folder.id}>
                  <button
                    className={folder.id === selectedFolderId ? 'workspace-item active' : 'workspace-item'}
                    type="button"
                    onClick={() => setSelectedFolderId(folder.id)}
                  >
                    <strong>{folder.title}</strong>
                    <span>排序 {folder.sortKey}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="pane-section note-list-section">
            <h2>{activeModule === 'records' ? '记录列表' : '笔记列表'}</h2>
            <ul className="workspace-list compact-list">
              {activeList.map((note) => (
                <li key={note.id}>
                  <button
                    className={note.id === selectedNoteId ? 'workspace-item active note-row' : 'workspace-item note-row'}
                    type="button"
                    onClick={() => selectNote(note)}
                  >
                    <strong>{note.title}</strong>
                    <span>
                      版本 {note.version}
                      {syncMetadataMap[note.id] ? ` / ${formatSyncStatus(syncMetadataMap[note.id].syncStatus)}` : ''}
                    </span>
                  </button>
                </li>
              ))}
              {activeList.length === 0 ? (
                <li className="empty-note">当前筛选下还没有{activeModule === 'records' ? '记录' : '笔记'}。</li>
              ) : null}
            </ul>
          </section>
        </aside>

        <section className="notegen-editor-pane" aria-label="编辑器">
          <div className="editor-tabs">
            <button className="editor-tab active" type="button">
              {currentNote?.title ?? `${activeModuleLabel}工作区`}
            </button>
          </div>
          {currentNote ? (
            <div className="editor-surface">
              <input
                aria-label="笔记标题"
                className="editor-title-input"
                value={noteTitle}
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  setNoteTitle(nextTitle);
                  saveDraft({
                    noteId: currentNote.id,
                    title: nextTitle,
                    markdownContent: noteContent,
                    savedAt: new Date().toISOString(),
                  });
                }}
                disabled={state.kind === 'offline-readonly' || isPending}
              />
              <textarea
                aria-label="Markdown 内容"
                className="editor-input markdown-editor"
                value={noteContent}
                onChange={(event) => {
                  const nextContent = event.target.value;
                  setNoteContent(nextContent);
                  saveDraft({
                    noteId: currentNote.id,
                    title: noteTitle,
                    markdownContent: nextContent,
                    savedAt: new Date().toISOString(),
                  });
                }}
                disabled={state.kind === 'offline-readonly' || isPending}
              />
            </div>
          ) : (
            <div className="editor-empty">
              <h2>选择一条{activeModule === 'records' ? '记录' : '笔记'}</h2>
              <p>选中左侧内容后可查看、编辑并同步 Markdown。</p>
            </div>
          )}
          <footer className="editor-footer">
            <span>{state.kind === 'offline-readonly' ? '离线只读，本地草稿仍会保留。' : '本地草稿自动保留。'}</span>
            <span>{currentNote ? `${noteContent.length} 字符` : '0 字符'}</span>
            {currentSyncMetadata ? (
              <span>
                {formatSyncStatus(currentSyncMetadata.syncStatus)} / 本地 {currentSyncMetadata.localVersion} / 云端{' '}
                {currentSyncMetadata.cloudVersion ?? '未知'}
              </span>
            ) : null}
            {currentNote ? (
              <button
                className="notegen-text-button save-button"
                type="button"
                disabled={state.kind === 'offline-readonly' || isPending}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      const metadata = await getSyncService().enqueue({
                        resourceId: currentNote.id,
                        resourceType: 'note',
                        localVersion: (currentSyncMetadata?.localVersion ?? currentNote.version) + 1,
                        cloudVersion: currentNote.version,
                        contentHash: buildSyncContentHash(`${noteTitle}\n${noteContent}`),
                        payload: {
                          knowledgeBaseId: currentNote.knowledgeBaseId,
                          title: noteTitle,
                          markdownContent: noteContent,
                          folderId: currentNote.folderId,
                        },
                        execute: async () => {
                          const saved = await updateNote(bootstrap.session, currentNote.id, {
                            title: noteTitle,
                            markdownContent: noteContent,
                            folderId: currentNote.folderId,
                            expectedVersion: currentNote.version,
                            expectedContentHash: currentNote.contentHash,
                          });
                          setTree((currentTree) => (currentTree ? buildNextTree(currentTree, saved) : currentTree));
                          setSelectedNoteId(saved.id);
                          setNoteTitle(saved.title);
                          setNoteContent(saved.markdownContent);
                          clearDraft(saved.id);
                          broadcastRef.current?.postMessage({
                            type: 'note-synced',
                            knowledgeBaseId: saved.knowledgeBaseId,
                          });
                          return {
                            cloudVersion: saved.version,
                            contentHash: saved.contentHash,
                          };
                        },
                      });

                      if (metadata.syncStatus === 'synced') {
                        setWorkspaceMessage('笔记已同步到云端。');
                      } else if (metadata.syncStatus === 'pending') {
                        saveDraft({
                          noteId: currentNote.id,
                          title: noteTitle,
                          markdownContent: noteContent,
                          savedAt: new Date().toISOString(),
                        });
                        setWorkspaceMessage('网络暂不可用，变更已进入待同步队列。');
                      } else if (metadata.syncStatus === 'conflict') {
                        saveDraft({
                          noteId: currentNote.id,
                          title: noteTitle,
                          markdownContent: noteContent,
                          savedAt: new Date().toISOString(),
                        });
                        setWorkspaceMessage('检测到云端版本更新，当前已记录冲突。');
                      } else {
                        setWorkspaceMessage('同步失败，请检查权限或稍后重试。');
                      }
                    } catch (error) {
                      saveDraft({
                        noteId: currentNote.id,
                        title: noteTitle,
                        markdownContent: noteContent,
                        savedAt: new Date().toISOString(),
                      });
                      setWorkspaceMessage(error instanceof Error ? error.message : '保存笔记失败。');
                    }
                  });
                }}
              >
                保存
              </button>
            ) : null}
          </footer>
        </section>

        <aside className="notegen-chat-pane" aria-label="右侧工作面板">
          <div className="chat-header">
            <strong>{activeModuleLabel}面板</strong>
            <span>{formatSyncStatus(currentSyncMetadata?.syncStatus ?? 'synced')}</span>
          </div>

          {activeModule === 'sharing' && state.kind === 'authenticated' ? (
            <div className="side-panel-scroll">
              <GroupManager session={bootstrap.session} readOnly={false} onMessage={setWorkspaceMessage} />
              <ShareSection
                session={bootstrap.session}
                knowledgeBases={knowledgeBases}
                readOnly={false}
                onMessage={setWorkspaceMessage}
              />
            </div>
          ) : null}

          {activeModule === 'developer' ? (
            <div className="chat-thread">
              <div className="chat-message assistant">
                <strong>开放接口</strong>
                <p>内容、同步、协作和 RAG 接口通过当前登录会话访问。</p>
              </div>
              <div className="chat-message assistant">
                <strong>当前资源</strong>
                <p>{currentNote ? `${currentNote.title} / 版本 ${currentNote.version}` : '尚未选中资源。'}</p>
              </div>
              <div className="chat-message assistant">
                <strong>环境配置</strong>
                <p>AI 推理和 Embedding 使用项目环境变量配置。</p>
              </div>
            </div>
          ) : null}

          {activeModule === 'settings' ? (
            <div className="chat-thread">
              <div className="chat-message assistant">
                <strong>工作区模式</strong>
                <p>{bootstrap.workspace.mode}</p>
              </div>
              <div className="chat-message assistant">
                <strong>默认知识库</strong>
                <p>{bootstrap.workspace.profile.defaultWorkspaceId ?? '尚未设置默认知识库。'}</p>
              </div>
              <div className="chat-message assistant">
                <strong>本地状态</strong>
                <p>草稿、同步队列和冲突记录保存在浏览器本地存储。</p>
              </div>
            </div>
          ) : null}

          {activeModule !== 'sharing' && activeModule !== 'developer' && activeModule !== 'settings' ? (
            <div className="chat-thread">
              <div className="chat-message assistant">
                <strong>工作区</strong>
                <p>{workspaceMessage ?? '当前工作区已连接浏览器端数据和 Supabase API。'}</p>
              </div>
              <div className="chat-message user">
                <strong>当前用户</strong>
                <p>{bootstrap.session.user.email}</p>
              </div>
              <div className="chat-message assistant">
                <strong>同步</strong>
                <p>待同步 {pendingSyncCount} 个，冲突 {conflicts.length} 个，模式 {bootstrap.workspace.mode}。</p>
              </div>
              {activeModule === 'ai' || activeModule === 'search' ? (
                <div className="chat-message assistant">
                  <strong>{activeModule === 'ai' ? '知识问答' : '全文搜索'}</strong>
                  <p>{currentNote ? `当前上下文：${currentNote.title}` : '选择笔记或记录后可使用当前内容作为上下文。'}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="conflict-box">
            <h2>同步冲突</h2>
            {activeConflict && state.kind === 'authenticated' && currentNote ? (
              <div className="conflict-actions">
                <button
                  className="notegen-text-button"
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        await adoptCloudVersion(activeConflict);
                      } catch (error) {
                        setWorkspaceMessage(error instanceof Error ? error.message : '采用云端版本失败。');
                      }
                    });
                  }}
                >
                  采用云端
                </button>
                <button
                  className="notegen-text-button primary"
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        await keepLocalVersion(activeConflict);
                      } catch (error) {
                        setWorkspaceMessage(error instanceof Error ? error.message : '重新提交本地版本失败。');
                      }
                    });
                  }}
                >
                  保留本地
                </button>
              </div>
            ) : null}
            {conflicts.length > 0 ? (
              <ul className="workspace-list compact-list">
                {conflicts.slice(0, 5).map((record) => (
                  <li key={record.resourceId}>
                    <div className={record.resourceId === selectedNoteId ? 'workspace-item active' : 'workspace-item'}>
                      <strong>{record.resourceId}</strong>
                      <span>{describeConflict(record, selectedNoteId)}</span>
                      <span>{new Date(record.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">当前没有待处理的同步冲突。</p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );

  function selectNote(note: Note) {
    const mergedNote = mergeNoteWithDraft(note, loadDraft(note.id));
    setSelectedNoteId(note.id);
    setNoteTitle(mergedNote.title);
    setNoteContent(mergedNote.markdownContent);
    const metadata = loadSyncMetadata(note.id);
    if (metadata) {
      setSyncMetadataMap((currentMap) => ({ ...currentMap, [note.id]: metadata }));
    }
  }

  function handleCreateKnowledgeBase() {
    if (!state || state.kind !== 'authenticated') {
      return;
    }

    startTransition(async () => {
      try {
        const created = await createKnowledgeBase(bootstrap.session, {
          name: `知识库 ${knowledgeBases.length + 1}`,
          description: '通过浏览器工作台创建',
        });
        const nextKnowledgeBases = [...knowledgeBases, created];
        setKnowledgeBases(nextKnowledgeBases);
        setSelectedKnowledgeBaseId(created.id);
        setSelectedFolderId(null);
        setSelectedNoteId(null);
        setTree({ knowledgeBase: created, folders: [], notes: [] });
        setNoteTitle('');
        setNoteContent('');
        setActiveModule('writing');
        setWorkspaceMessage('已创建新的知识库。');
      } catch (error) {
        setWorkspaceMessage(error instanceof Error ? error.message : '创建知识库失败。');
      }
    });
  }

  function handleCreateFolder() {
    if (!state || state.kind !== 'authenticated' || !selectedKnowledgeBaseId) {
      return;
    }

    startTransition(async () => {
      try {
        const folder = await createFolder(bootstrap.session, {
          knowledgeBaseId: selectedKnowledgeBaseId,
          parentFolderId: null,
          title: `目录 ${visibleFolders.length + 1}`,
          sortKey: `${visibleFolders.length + 1}`.padStart(4, '0'),
        });
        setTree((currentTree) => (currentTree ? buildNextTreeWithFolder(currentTree, folder) : currentTree));
        setSelectedFolderId(folder.id);
        setWorkspaceMessage('已创建新目录。');
      } catch (error) {
        setWorkspaceMessage(error instanceof Error ? error.message : '创建目录失败。');
      }
    });
  }

  function handleCreateNote(kind: 'note' | 'record') {
    if (!state || state.kind !== 'authenticated' || !selectedKnowledgeBaseId) {
      return;
    }

    startTransition(async () => {
      try {
        const now = new Date();
        const timestamp = now.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        const note = await createNote(bootstrap.session, {
          knowledgeBaseId: selectedKnowledgeBaseId,
          folderId: selectedFolderId,
          title: kind === 'record' ? `记录 ${timestamp}` : `未命名笔记 ${visibleNotes.length + 1}`,
          markdownContent: kind === 'record' ? `> 记录 ${timestamp}\n\n` : '',
        });
        setTree((currentTree) => (currentTree ? buildNextTree(currentTree, note) : currentTree));
        setSelectedNoteId(note.id);
        setNoteTitle(note.title);
        setNoteContent(note.markdownContent);
        setActiveModule(kind === 'record' ? 'records' : 'writing');
        setWorkspaceMessage(kind === 'record' ? '已创建新记录。' : '已创建新笔记。');
      } catch (error) {
        setWorkspaceMessage(error instanceof Error ? error.message : kind === 'record' ? '创建记录失败。' : '创建笔记失败。');
      }
    });
  }

  function handleRefreshCurrentKnowledgeBase() {
    if (!state || state.kind !== 'authenticated' || !selectedKnowledgeBaseId) {
      return;
    }

    startTransition(async () => {
      try {
        await refreshKnowledgeBaseTree(bootstrap, selectedKnowledgeBaseId, true);
        setWorkspaceMessage('已刷新当前知识库。');
      } catch (error) {
        setWorkspaceMessage(error instanceof Error ? error.message : '刷新当前知识库失败。');
      }
    });
  }

  function getSyncService() {
    if (!syncServiceRef.current) {
      syncServiceRef.current = createSyncService({
        persistMetadata: (metadata) => {
          saveSyncMetadata(metadata);
          setSyncMetadataMap((currentMap) => ({ ...currentMap, [metadata.resourceId]: metadata }));
        },
        persistSyncEvent: async (input) => {
          const session = sessionRef.current;
          if (!session) {
            return;
          }

          try {
            await createSyncEvent(session, input);
          } catch {
            // Sync telemetry should not block content reconciliation.
          }
        },
        persistConflict: (record) => {
          saveConflictRecord(record);
          setConflicts(loadConflictRecords());
        },
      });
    }

    return syncServiceRef.current;
  }

  async function refreshKnowledgeBaseTree(bootstrapState: AuthBootstrap, knowledgeBaseId: string, force = false) {
    if (!force) {
      const hasChanges = await hasRemoteChangesForKnowledgeBase(bootstrapState, knowledgeBaseId);
      if (!hasChanges) {
        return false;
      }
    }

    const nextTree = await getKnowledgeBaseTree(bootstrapState.session, knowledgeBaseId);
    setTree(nextTree);
    syncCursorRef.current = new Date().toISOString();

    if (!selectedNoteId) {
      return true;
    }

    const refreshedCurrentNote = nextTree.notes.find((note) => note.id === selectedNoteId) ?? null;
    if (!refreshedCurrentNote) {
      const fallbackNote = getVisibleNotes(nextTree, selectedFolderId)[0] ?? null;
      if (fallbackNote) {
        selectNote(fallbackNote);
      }
      return true;
    }

    const mergedNote = mergeNoteWithDraft(refreshedCurrentNote, loadDraft(refreshedCurrentNote.id));
    setNoteTitle(mergedNote.title);
    setNoteContent(mergedNote.markdownContent);
    return true;
  }

  async function hasRemoteChangesForKnowledgeBase(bootstrapState: AuthBootstrap, knowledgeBaseId: string) {
    const events = await listSyncEvents(bootstrapState.session, {
      since: syncCursorRef.current ?? undefined,
      limit: 20,
    });

    if (events.length === 0) {
      return false;
    }

    syncCursorRef.current = events[0]?.createdAt ?? syncCursorRef.current;

    return events.some((event) => {
      if (event.resourceType === 'knowledge_base') {
        return event.resourceId === knowledgeBaseId;
      }

      return event.payload.knowledgeBaseId === knowledgeBaseId;
    });
  }

  async function hydrateWorkspace(bootstrapState: AuthBootstrap) {
    const liveKnowledgeBases = await listKnowledgeBases(bootstrapState.session);
    setKnowledgeBases(liveKnowledgeBases);

    const defaultKnowledgeBaseId =
      bootstrapState.workspace.profile.defaultWorkspaceId ?? liveKnowledgeBases[0]?.id ?? null;

    setSelectedKnowledgeBaseId(defaultKnowledgeBaseId);

    if (!defaultKnowledgeBaseId) {
      setTree(null);
      return;
    }

    const nextTree = await getKnowledgeBaseTree(bootstrapState.session, defaultKnowledgeBaseId);
    setTree(nextTree);
    syncCursorRef.current = new Date().toISOString();
    setSelectedFolderId(null);

    const firstNote = getVisibleNotes(nextTree, null)[0] ?? null;
    if (firstNote) {
      const mergedNote = mergeNoteWithDraft(firstNote, loadDraft(firstNote.id));
      setSelectedNoteId(firstNote.id);
      setNoteTitle(mergedNote.title);
      setNoteContent(mergedNote.markdownContent);
    } else {
      setSelectedNoteId(null);
      setNoteTitle('');
      setNoteContent('');
    }
  }

  async function adoptCloudVersion(record: ConflictRecord) {
    if (!selectedKnowledgeBaseId) {
      throw new Error('当前没有可刷新的知识库。');
    }

    clearDraft(record.resourceId);
    const nextTree = await getKnowledgeBaseTree(bootstrap.session, selectedKnowledgeBaseId);
    const cloudNote = nextTree.notes.find((note) => note.id === record.resourceId) ?? null;
    setTree(nextTree);
    syncCursorRef.current = new Date().toISOString();
    removeConflictRecord(record.resourceId);
    setConflicts(loadConflictRecords());

    if (!cloudNote) {
      setSelectedNoteId(null);
      setNoteTitle('');
      setNoteContent('');
      setWorkspaceMessage('已采用云端结果，原冲突笔记已不在当前知识库中。');
      return;
    }

    setSelectedNoteId(cloudNote.id);
    setNoteTitle(cloudNote.title);
    setNoteContent(cloudNote.markdownContent);
    const metadata: SyncMetadata = {
      resourceId: cloudNote.id,
      resourceType: 'note',
      localVersion: cloudNote.version,
      cloudVersion: cloudNote.version,
      syncStatus: 'synced',
      contentHash: cloudNote.contentHash,
      lastSyncedAt: new Date().toISOString(),
      tombstone: false,
    };
    saveSyncMetadata(metadata);
    setSyncMetadataMap((currentMap) => ({ ...currentMap, [cloudNote.id]: metadata }));
    setWorkspaceMessage('已采用云端版本并清除冲突。');
  }

  async function keepLocalVersion(record: ConflictRecord) {
    if (!selectedKnowledgeBaseId || !currentNote) {
      throw new Error('请先选中发生冲突的笔记。');
    }

    const localTitle = noteTitle;
    const localContent = noteContent;
    const nextTree = await getKnowledgeBaseTree(bootstrap.session, selectedKnowledgeBaseId);
    const cloudNote = nextTree.notes.find((note) => note.id === record.resourceId) ?? null;

    if (!cloudNote) {
      throw new Error('云端已找不到这条冲突笔记。');
    }

    setTree(nextTree);
    syncCursorRef.current = new Date().toISOString();
    setSelectedNoteId(cloudNote.id);
    setNoteTitle(localTitle);
    setNoteContent(localContent);
    saveDraft({
      noteId: cloudNote.id,
      title: localTitle,
      markdownContent: localContent,
      savedAt: new Date().toISOString(),
    });

    const metadata = await getSyncService().enqueue({
      resourceId: cloudNote.id,
      resourceType: 'note',
      localVersion: Math.max(record.localVersion, cloudNote.version) + 1,
      cloudVersion: cloudNote.version,
      contentHash: buildSyncContentHash(`${localTitle}\n${localContent}`),
      payload: {
        knowledgeBaseId: cloudNote.knowledgeBaseId,
        title: localTitle,
        markdownContent: localContent,
        folderId: cloudNote.folderId,
      },
      execute: async () => {
        const saved = await updateNote(bootstrap.session, cloudNote.id, {
          title: localTitle,
          markdownContent: localContent,
          folderId: cloudNote.folderId,
          expectedVersion: cloudNote.version,
          expectedContentHash: cloudNote.contentHash,
        });
        setTree((currentTree) => (currentTree ? buildNextTree(currentTree, saved) : currentTree));
        setSelectedNoteId(saved.id);
        setNoteTitle(saved.title);
        setNoteContent(saved.markdownContent);
        clearDraft(saved.id);
        broadcastRef.current?.postMessage({
          type: 'note-synced',
          knowledgeBaseId: saved.knowledgeBaseId,
        });
        return {
          cloudVersion: saved.version,
          contentHash: saved.contentHash,
        };
      },
    });

    if (metadata.syncStatus === 'synced') {
      removeConflictRecord(record.resourceId);
      setConflicts(loadConflictRecords());
      setWorkspaceMessage('已基于最新云端版本重新提交本地内容。');
      return;
    }

    if (metadata.syncStatus === 'pending') {
      setWorkspaceMessage('网络暂不可用，本地版本已重新进入待同步队列。');
      return;
    }

    if (metadata.syncStatus === 'conflict') {
      setWorkspaceMessage('云端内容再次变化，冲突记录已更新。');
      return;
    }

    setWorkspaceMessage('重新提交本地版本失败，请稍后再试。');
  }
}
