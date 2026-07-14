// Runtime message validation — guards against injected messages and type mismatches

import { isMessage, MSG, type ExtensionMessage } from '../types/messages';

/**
 * Validate that a message came from within this extension
 * (sender.id must match chrome.runtime.id).
 */
export function isInternalSender(sender: chrome.runtime.MessageSender): boolean {
  return sender.id === chrome.runtime.id;
}

/**
 * Validate that a message came from an allowed external origin (auth bridge page).
 * Used by background.onMessageExternal listener.
 */
export function isAllowedExternalOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  const allowed = [
    'http://localhost:3000',
    'https://clipiq.vercel.app',
  ];
  return allowed.some((o) => origin.startsWith(o));
}

/**
 * Parse and validate an incoming runtime message.
 * Returns null if invalid, typed ExtensionMessage if valid.
 */
export function parseMessage(data: unknown): ExtensionMessage | null {
  if (!isMessage(data)) return null;
  // Ensure type is one of our known MSG values
  const knownTypes = Object.values(MSG) as string[];
  if (!knownTypes.includes(data.type)) {
    console.warn('[ClipIQ] Unknown message type received:', data.type);
    return null;
  }
  return data;
}

/**
 * Generate a unique recording filename matching the desktop app's pattern:
 * `{uuid8}-{userId8}.webm`
 */
export function generateFilename(userId: string): string {
  const randomPart = crypto.randomUUID().split('-')[0]; // 8 hex chars
  const userPart = userId.slice(0, 8);
  return `${randomPart}-${userPart}.webm`;
}

/**
 * Format elapsed milliseconds as HH:MM:SS timer string.
 * Matches `videoRecordingTime()` from desktop app's utils.ts.
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
