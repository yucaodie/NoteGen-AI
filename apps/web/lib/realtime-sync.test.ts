import { describe, expect, it, vi } from 'vitest';
import {
  buildRealtimeSyncWebSocketUrl,
  createRealtimeSyncSubscription,
  extractKnowledgeBaseIdFromRealtimeMessage,
} from './realtime-sync';

class FakeSocket {
  closed = false;
  sent: string[] = [];
  listeners: Record<string, Array<(event: Event | MessageEvent) => void>> = {
    close: [],
    error: [],
    message: [],
    open: [],
  };

  addEventListener(type: 'open' | 'message' | 'close' | 'error', listener: (event: Event | MessageEvent) => void) {
    this.listeners[type].push(listener);
  }

  removeEventListener(type: 'open' | 'message' | 'close' | 'error', listener: (event: Event | MessageEvent) => void) {
    this.listeners[type] = this.listeners[type].filter((current) => current !== listener);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.closed = true;
  }

  emit(type: 'open' | 'message' | 'close' | 'error', event?: Event | MessageEvent) {
    for (const listener of this.listeners[type]) {
      listener(event ?? new Event(type));
    }
  }
}

describe('realtime-sync', () => {
  it('builds the Supabase realtime websocket url', () => {
    expect(
      buildRealtimeSyncWebSocketUrl({
        url: 'https://demo.supabase.co',
        anonKey: 'anon-key',
      }),
    ).toBe('wss://demo.supabase.co/realtime/v1/websocket?apikey=anon-key&log_level=error&vsn=1.0.0');
  });

  it('skips subscriptions when Supabase realtime config is missing', () => {
    const webSocketFactory = vi.fn(() => new FakeSocket());

    const dispose = createRealtimeSyncSubscription({
      accessToken: 'access-token',
      config: { url: '', anonKey: '' },
      onKnowledgeBaseChange: vi.fn(),
      webSocketFactory,
    });

    expect(webSocketFactory).not.toHaveBeenCalled();
    expect(dispose()).toBeUndefined();
  });

  it('throws a clear error for invalid realtime websocket urls', () => {
    expect(() => buildRealtimeSyncWebSocketUrl({ url: '', anonKey: 'anon-key' })).toThrow(
      'Supabase realtime configuration is missing or invalid.',
    );
  });

  it('extracts the target knowledge base from postgres change payloads', () => {
    expect(
      extractKnowledgeBaseIdFromRealtimeMessage(
        JSON.stringify({
          event: 'postgres_changes',
          payload: {
            data: {
              record: {
                resource_type: 'note',
                resource_id: 'note-1',
                payload: { knowledgeBaseId: 'kb-1' },
              },
            },
          },
        }),
      ),
    ).toBe('kb-1');

    expect(
      extractKnowledgeBaseIdFromRealtimeMessage(
        JSON.stringify({
          event: 'postgres_changes',
          payload: {
            data: {
              record: {
                resource_type: 'knowledge_base',
                resource_id: 'kb-2',
                payload: {},
              },
            },
          },
        }),
      ),
    ).toBe('kb-2');
  });

  it('subscribes to sync_events and forwards matching knowledge base updates', () => {
    vi.useFakeTimers();
    const socket = new FakeSocket();
    const onKnowledgeBaseChange = vi.fn();

    const dispose = createRealtimeSyncSubscription({
      accessToken: 'access-token',
      config: { url: 'https://demo.supabase.co', anonKey: 'anon-key' },
      heartbeatIntervalMs: 1000,
      onKnowledgeBaseChange,
      webSocketFactory: () => socket,
    });

    socket.emit('open');

    expect(socket.sent).toHaveLength(2);
    expect(socket.sent[0]).toContain('access_token');
    expect(socket.sent[1]).toContain('realtime:public:sync_events');

    socket.emit(
      'message',
      new MessageEvent('message', {
        data: JSON.stringify({
          event: 'postgres_changes',
          payload: {
            data: {
              record: {
                resource_type: 'note',
                resource_id: 'note-1',
                payload: { knowledgeBaseId: 'kb-live' },
              },
            },
          },
        }),
      }),
    );

    expect(onKnowledgeBaseChange).toHaveBeenCalledWith('kb-live');

    vi.advanceTimersByTime(1000);
    expect(socket.sent[2]).toContain('heartbeat');

    dispose();
    expect(socket.closed).toBe(true);
    vi.useRealTimers();
  });
});
