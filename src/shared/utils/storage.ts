// Typed wrappers around chrome.storage.session and chrome.storage.local
// Storage selection:
//   chrome.storage.session — auth tokens, active recording state (cleared on browser restart)
//   chrome.storage.local   — settings, recent recordings (persisted)

import type { ExtensionSession, ExtensionSettings } from '../types/user';
import type { RecordingSession } from '../types/recording';
import { CONFIG } from '../constants/config';

// ─── Session Storage (ephemeral) ─────────────────────────────────────────────

export async function getSession(): Promise<ExtensionSession | null> {
  const result = await chrome.storage.session.get(CONFIG.SESSION_KEY);
  return (result[CONFIG.SESSION_KEY] as ExtensionSession) ?? null;
}

export async function setSession(session: ExtensionSession): Promise<void> {
  await chrome.storage.session.set({ [CONFIG.SESSION_KEY]: session });
}

export async function clearSession(): Promise<void> {
  await chrome.storage.session.remove(CONFIG.SESSION_KEY);
}

export async function isSessionValid(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  return session.expiresAt > Date.now() + 60_000; // Must have > 1 min remaining
}

// ─── Recording State (session storage for crash recovery) ────────────────────

export async function getPersistedRecordingSession(): Promise<RecordingSession | null> {
  const result = await chrome.storage.session.get(CONFIG.RECORDING_STATE_KEY);
  return (result[CONFIG.RECORDING_STATE_KEY] as RecordingSession) ?? null;
}

export async function persistRecordingSession(session: RecordingSession | null): Promise<void> {
  if (session === null) {
    await chrome.storage.session.remove(CONFIG.RECORDING_STATE_KEY);
  } else {
    await chrome.storage.session.set({ [CONFIG.RECORDING_STATE_KEY]: session });
  }
}

// ─── Settings (local storage — persisted) ────────────────────────────────────

const DEFAULT_SETTINGS: ExtensionSettings = {
  quality: 'HD_1080P' as ExtensionSettings['quality'],
  includeMic: true,
  showFloatingControls: true,
  preferredMode: 'TAB' as ExtensionSettings['preferredMode'],
};

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(CONFIG.SETTINGS_KEY);
  const stored = result[CONFIG.SETTINGS_KEY] as Partial<ExtensionSettings> | undefined;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.local.set({
    [CONFIG.SETTINGS_KEY]: { ...current, ...settings },
  });
}

// ─── Recent Recordings (local storage) ───────────────────────────────────────

import type { RecentRecording } from '../types/recording';

const MAX_RECENT = 10;

export async function getRecentRecordings(): Promise<RecentRecording[]> {
  const result = await chrome.storage.local.get(CONFIG.RECORDINGS_KEY);
  return (result[CONFIG.RECORDINGS_KEY] as RecentRecording[]) ?? [];
}

export async function addRecentRecording(recording: RecentRecording): Promise<void> {
  const current = await getRecentRecordings();
  const updated = [recording, ...current].slice(0, MAX_RECENT);
  await chrome.storage.local.set({ [CONFIG.RECORDINGS_KEY]: updated });
}

export async function clearRecentRecordings(): Promise<void> {
  await chrome.storage.local.remove(CONFIG.RECORDINGS_KEY);
}
