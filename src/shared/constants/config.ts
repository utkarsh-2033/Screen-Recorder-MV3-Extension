// ─── Global Configuration ─────────────────────────────────────────────────────
// All URLs and limits in one place. Build-time constants via Vite define.

declare const __SOCKET_URL__: string;
declare const __HOST_URL__: string;
declare const __DEV__: boolean;

export const CONFIG = {
  // Server URLs — injected at build time by vite.config.ts
  SOCKET_URL: __SOCKET_URL__,   // 'https://clipiq.onrender.com' in prod
  HOST_URL: __HOST_URL__,       // 'https://clipiq.vercel.app' in prod

  // Extension Auth Bridge page on the Next.js frontend
  get EXTENSION_AUTH_URL() {
    return `${this.HOST_URL}/extension-auth`;
  },

  // Dashboard URL
  get DASHBOARD_URL() {
    return `${this.HOST_URL}/dashboard`;
  },

  IS_DEV: __DEV__,

  // Recording limits
  FREE_PLAN_MAX_MINUTES: 5,     // Matches desktop app's 5 minute limit
  CHUNK_INTERVAL_MS: 1000,      // 1-second chunks (matches desktop recorder.ts)
  CODEC: 'video/webm; codecs=vp9', // Matches server blob type in socketChunks

  // SW Keepalive — Chrome kills SW after ~30s inactivity
  KEEPALIVE_ALARM_NAME: 'clipiq-keepalive',
  KEEPALIVE_INTERVAL_MINUTES: 0.4, // ~24 seconds

  // Offscreen document
  OFFSCREEN_HTML: 'src/offscreen/offscreen.html',

  // Session management
  TOKEN_REFRESH_THRESHOLD_MS: 5 * 60 * 1000, // Refresh if < 5 mins left
  TOKEN_LIFETIME_MS: 60 * 60 * 1000,          // 1 hour token lifetime

  // Upload
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_BASE_DELAY_MS: 2000,
  SOCKET_RECONNECT_ATTEMPTS: 5,
  SOCKET_RECONNECT_DELAY_MS: 1000,

  // Storage keys (defined in types/user.ts for DRY, re-exported here)
  SESSION_KEY: 'clipiq_session',
  RECORDINGS_KEY: 'clipiq_recent_recordings',
  SETTINGS_KEY: 'clipiq_settings',
  RECORDING_STATE_KEY: 'clipiq_recording_state',  // Persisted for crash recovery
} as const;
