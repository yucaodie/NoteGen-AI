import { getSupabaseBrowserConfig, type SupabaseBrowserConfig } from './supabase/client';

type RealtimeMessage = {
  event?: string;
  payload?: {
    data?: {
      record?: Record<string, unknown>;
    };
    record?: Record<string, unknown>;
  };
};

type RealtimeSocket = {
  close: () => void;
  send: (data: string) => void;
  addEventListener: (type: 'open' | 'message' | 'close' | 'error', listener: (event: Event | MessageEvent) => void) => void;
  removeEventListener: (type: 'open' | 'message' | 'close' | 'error', listener: (event: Event | MessageEvent) => void) => void;
};

type RealtimeSyncOptions = {
  accessToken: string;
  onKnowledgeBaseChange: (knowledgeBaseId: string) => void;
  webSocketFactory?: (url: string) => RealtimeSocket;
  config?: SupabaseBrowserConfig;
  heartbeatIntervalMs?: number;
  reconnectDelayMs?: number;
  scheduleReconnect?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  clearScheduledReconnect?: (timer: ReturnType<typeof setTimeout>) => void;
};

export function createRealtimeSyncSubscription(options: RealtimeSyncOptions) {
  const config = options.config ?? getSupabaseBrowserConfig();
  const timerScope = typeof window === 'undefined' ? globalThis : window;
  const webSocketFactory =
    options.webSocketFactory ??
    ((url: string) => {
      if (typeof WebSocket === 'undefined') {
        throw new Error('Realtime WebSocket is unavailable in this environment.');
      }

      return new WebSocket(url);
    });
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? 30_000;
  const reconnectDelayMs = options.reconnectDelayMs ?? 2_000;
  const scheduleReconnect = options.scheduleReconnect ?? timerScope.setTimeout.bind(timerScope);
  const clearScheduledReconnect = options.clearScheduledReconnect ?? timerScope.clearTimeout.bind(timerScope);

  let closed = false;
  let joinRef = 1;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let socket: RealtimeSocket | null = null;

  const connect = () => {
    if (closed) {
      return;
    }

    socket = webSocketFactory(buildRealtimeSyncWebSocketUrl(config));
    socket.addEventListener('open', handleOpen);
    socket.addEventListener('message', handleMessage);
    socket.addEventListener('close', handleClose);
    socket.addEventListener('error', handleClose);
  };

  const handleOpen = () => {
    if (!socket) {
      return;
    }

    socket.send(
      JSON.stringify({
        topic: 'phoenix',
        event: 'access_token',
        payload: { access_token: options.accessToken },
        ref: String(joinRef),
      }),
    );

    socket.send(
      JSON.stringify({
        topic: 'realtime:public:sync_events',
        event: 'phx_join',
        payload: {
          config: {
            broadcast: { ack: false, self: false },
            presence: { key: '' },
            postgres_changes: [{ event: '*', schema: 'public', table: 'sync_events' }],
          },
          access_token: options.accessToken,
        },
        ref: String(joinRef),
      }),
    );
    joinRef += 1;

    heartbeatTimer = timerScope.setInterval(() => {
      socket?.send(
        JSON.stringify({
          topic: 'phoenix',
          event: 'heartbeat',
          payload: {},
          ref: String(joinRef),
        }),
      );
      joinRef += 1;
    }, heartbeatIntervalMs);
  };

  const handleMessage = (event: Event | MessageEvent) => {
    const knowledgeBaseId = extractKnowledgeBaseIdFromRealtimeMessage((event as MessageEvent).data);
    if (knowledgeBaseId) {
      options.onKnowledgeBaseChange(knowledgeBaseId);
    }
  };

  const handleClose = () => {
    if (heartbeatTimer) {
      timerScope.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    if (closed || reconnectTimer) {
      return;
    }

    reconnectTimer = scheduleReconnect(() => {
      reconnectTimer = null;
      connect();
    }, reconnectDelayMs);
  };

  connect();

  return () => {
    closed = true;
    if (heartbeatTimer) {
      timerScope.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (reconnectTimer) {
      clearScheduledReconnect(reconnectTimer);
      reconnectTimer = null;
    }
    if (socket) {
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('message', handleMessage);
      socket.removeEventListener('close', handleClose);
      socket.removeEventListener('error', handleClose);
      socket.close();
      socket = null;
    }
  };
}

export function buildRealtimeSyncWebSocketUrl(config: SupabaseBrowserConfig) {
  const url = new URL(config.url);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/realtime/v1/websocket';
  url.search = new URLSearchParams({
    apikey: config.anonKey,
    log_level: 'error',
    vsn: '1.0.0',
  }).toString();
  return url.toString();
}

export function extractKnowledgeBaseIdFromRealtimeMessage(input: string) {
  try {
    const message = JSON.parse(input) as RealtimeMessage;
    if (message.event !== 'postgres_changes') {
      return null;
    }

    const record = message.payload?.data?.record ?? message.payload?.record;
    if (!record) {
      return null;
    }

    const resourceType = readString(record.resource_type);
    const resourceId = readString(record.resource_id);
    const payload = record.payload;

    if (resourceType === 'knowledge_base' && resourceId) {
      return resourceId;
    }

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    return readString((payload as Record<string, unknown>).knowledgeBaseId) ?? readString((payload as Record<string, unknown>).knowledge_base_id);
  } catch {
    return null;
  }
}

function readString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}
