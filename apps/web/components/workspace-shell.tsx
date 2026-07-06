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
import { loadAllSyncMetadata, loadConflictRecords, loadSyncMetadata, saveConflictRecord, saveSyncMetadata } from '../lib/sync-storage';
import { countPendingSyncItems, describeConflict, formatSyncStatus } from '../lib/workspace-sync';
import { buildNextTree, buildNextTreeWithFolder, getVisibleNotes, mergeNoteWithDraft, sortFolders } from '../lib/workspace-content';
import { recoverWorkspaceSessionState, type WorkspaceRecoveryState } from '../lib/workspace-session';

export function WorkspaceShell() {
  const [state, setState] = useState<WorkspaceRecoveryState | null>(null);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [tree, setTree] = useState<KnowledgeBaseTree | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [syncMetadataMap, setSyncMetadataMap] = useState<Record<string, SyncMetadata>>({});
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [isPending, startTransition] = useTransition();
  const syncServiceRef = useRef<SyncService | null>(null);
  const sessionRef = useRef<AuthBootstrap['session'] | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);

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
        void refreshKnowledgeBaseTree(state.bootstrap, payload.knowledgeBaseId);
      }
    };

    return () => {
      channel.close();
      broadcastRef.current = null;
    };
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
        .then(() => {
          setWorkspaceMessage('已刷新当前知识库的云端状态。');
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
  const currentNote = selectedNoteId ? tree?.notes.find((note) => note.id === selectedNoteId) ?? null : null;
  const currentSyncMetadata = currentNote ? syncMetadataMap[currentNote.id] ?? null : null;
  const pendingSyncCount = countPendingSyncItems(syncMetadataMap);
  const visibleNotes = tree ? getVisibleNotes(tree, selectedFolderId) : [];
  const visibleFolders = tree ? sortFolders(tree.folders) : [];

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

        <p className="workspace-subtitle hero-copy">{workspaceMessage ?? state.message}</p>

        <div className="panel-grid workspace-panels">
          <article className="panel-card">
            <h2 className="panel-title">当前用户</h2>
            <p className="panel-copy">{bootstrap.session.user.email}</p>
            <p className="status-note">显示名：{bootstrap.workspace.profile.displayName}</p>
            <p className="status-note">模式：{bootstrap.workspace.mode}</p>
            <p className="status-note">待同步资源：{pendingSyncCount} 个</p>
            <p className="status-note">冲突记录：{conflicts.length} 个</p>
          </article>

          <article className="panel-card">
            <h2 className="panel-title">默认工作区</h2>
            <p className="panel-copy">{bootstrap.workspace.profile.defaultWorkspaceId ?? '尚未初始化'}</p>
            <p className="status-note">
              当前可访问知识域：{knowledgeBases.length || bootstrap.workspace.accessContext.knowledgeBaseIds.length} 个
            </p>
            {state.kind === 'authenticated' ? (
              <div className="cta-row compact-actions">
                <button
                  className="secondary-button"
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        const created = await createKnowledgeBase(bootstrap.session, {
                          name: `New Workspace ${knowledgeBases.length + 1}`,
                          description: 'Created from the browser workspace',
                        });
                        const nextKnowledgeBases = [...knowledgeBases, created];
                        setKnowledgeBases(nextKnowledgeBases);
                        setSelectedKnowledgeBaseId(created.id);
                        setSelectedFolderId(null);
                        setSelectedNoteId(null);
                        setTree({ knowledgeBase: created, folders: [], notes: [] });
                        setNoteTitle('');
                        setNoteContent('');
                        setWorkspaceMessage('已创建新的知识库工作区。');
                      } catch (error) {
                        setWorkspaceMessage(error instanceof Error ? error.message : '创建知识库失败。');
                      }
                    });
                  }}
                >
                  新建知识库
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={isPending || !selectedKnowledgeBaseId}
                  onClick={() => {
                    if (!selectedKnowledgeBaseId) {
                      return;
                    }

                    startTransition(async () => {
                      try {
                        const folder = await createFolder(bootstrap.session, {
                          knowledgeBaseId: selectedKnowledgeBaseId,
                          parentFolderId: null,
                          title: `Folder ${visibleFolders.length + 1}`,
                          sortKey: `${visibleFolders.length + 1}`.padStart(4, '0'),
                        });
                        setTree((currentTree) => (currentTree ? buildNextTreeWithFolder(currentTree, folder) : currentTree));
                        setSelectedFolderId(folder.id);
                        setWorkspaceMessage('已创建新文件夹。');
                      } catch (error) {
                        setWorkspaceMessage(error instanceof Error ? error.message : '创建文件夹失败。');
                      }
                    });
                  }}
                >
                  新建文件夹
                </button>
                <button
                  className="primary-button"
                  type="button"
                  disabled={isPending || !selectedKnowledgeBaseId}
                  onClick={() => {
                    if (!selectedKnowledgeBaseId) {
                      return;
                    }

                    startTransition(async () => {
                      try {
                        const note = await createNote(bootstrap.session, {
                          knowledgeBaseId: selectedKnowledgeBaseId,
                          folderId: selectedFolderId,
                          title: `Untitled Note ${visibleNotes.length + 1}`,
                          markdownContent: '',
                        });
                        setTree((currentTree) => (currentTree ? buildNextTree(currentTree, note) : currentTree));
                        setSelectedNoteId(note.id);
                        setNoteTitle(note.title);
                        setNoteContent(note.markdownContent);
                        setWorkspaceMessage('已创建新笔记。');
                      } catch (error) {
                        setWorkspaceMessage(error instanceof Error ? error.message : '创建笔记失败。');
                      }
                    });
                  }}
                >
                  新建笔记
                </button>
              </div>
            ) : null}
          </article>
        </div>
      </section>

      <section className="workspace-board" aria-label="知识库内容工作区">
        <article className="panel-card">
          <h2 className="panel-title">知识库</h2>
          <ul className="workspace-list">
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
                  <span className="status-note">{knowledgeBase.description ?? '暂无描述'}</span>
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel-card">
          <h2 className="panel-title">目录树</h2>
          <ul className="workspace-list">
            <li>
              <button
                className={selectedFolderId === null ? 'workspace-item active' : 'workspace-item'}
                type="button"
                onClick={() => setSelectedFolderId(null)}
              >
                <strong>全部笔记</strong>
                <span className="status-note">显示当前知识库中的全部笔记</span>
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
                  <span className="status-note">排序键：{folder.sortKey}</span>
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel-card">
          <h2 className="panel-title">笔记列表</h2>
          <ul className="workspace-list">
            {visibleNotes.map((note) => (
              <li key={note.id}>
                <button
                  className={note.id === selectedNoteId ? 'workspace-item active' : 'workspace-item'}
                  type="button"
                  onClick={() => selectNote(note)}
                >
                  <strong>{note.title}</strong>
                  <span className="status-note">
                    版本 {note.version}
                    {syncMetadataMap[note.id] ? ` · ${formatSyncStatus(syncMetadataMap[note.id].syncStatus)}` : ''}
                  </span>
                </button>
              </li>
            ))}
            {visibleNotes.length === 0 ? <li className="status-note">当前筛选下还没有笔记。</li> : null}
          </ul>
        </article>

        <article className="panel-card editor-panel">
          <h2 className="panel-title">笔记详情</h2>
          {currentNote ? (
            <div className="editor-grid">
              <label className="field-label">
                标题
                <input
                  aria-label="笔记标题"
                  className="text-input"
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
              </label>
              <label className="field-label">
                Markdown
                <textarea
                  aria-label="Markdown 内容"
                  className="editor-input"
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
              </label>
              <div className="cta-row compact-actions">
                <button
                  className="primary-button"
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
                  保存笔记
                </button>
                <span className="status-note">
                  {state.kind === 'offline-readonly' ? '当前为离线只读模式，本地草稿仍会保留。' : '编辑器会自动保留本地草稿。'}
                </span>
              </div>
              {currentSyncMetadata ? (
                <p className="status-note">
                  同步状态：{formatSyncStatus(currentSyncMetadata.syncStatus)} · 本地版本 {currentSyncMetadata.localVersion} · 云端版本{' '}
                  {currentSyncMetadata.cloudVersion ?? 'unknown'}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="panel-copy">选择一条笔记后可在这里查看和编辑 Markdown 内容。</p>
          )}
        </article>

        <article className="panel-card">
          <h2 className="panel-title">同步冲突</h2>
          {conflicts.length > 0 ? (
            <ul className="workspace-list">
              {conflicts.slice(0, 5).map((record) => (
                <li key={record.resourceId}>
                  <div className={record.resourceId === selectedNoteId ? 'workspace-item active' : 'workspace-item'}>
                    <strong>{record.resourceId}</strong>
                    <span className="status-note">{describeConflict(record, selectedNoteId)}</span>
                    <span className="status-note">记录时间：{new Date(record.createdAt).toLocaleString('zh-CN')}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-copy">当前没有待处理的同步冲突。</p>
          )}
        </article>
      </section>
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

  async function refreshKnowledgeBaseTree(bootstrapState: AuthBootstrap, knowledgeBaseId: string) {
    const nextTree = await getKnowledgeBaseTree(bootstrapState.session, knowledgeBaseId);
    setTree(nextTree);

    if (!selectedNoteId) {
      return;
    }

    const refreshedCurrentNote = nextTree.notes.find((note) => note.id === selectedNoteId) ?? null;
    if (!refreshedCurrentNote) {
      const fallbackNote = getVisibleNotes(nextTree, selectedFolderId)[0] ?? null;
      if (fallbackNote) {
        selectNote(fallbackNote);
      }
      return;
    }

    const mergedNote = mergeNoteWithDraft(refreshedCurrentNote, loadDraft(refreshedCurrentNote.id));
    setNoteTitle(mergedNote.title);
    setNoteContent(mergedNote.markdownContent);
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
}
