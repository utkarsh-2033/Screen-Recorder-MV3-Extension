// ─── ClipIQ Chrome Extension — Background Service Worker ─────────────────────
//
// All event listeners MUST be registered at top-level (not inside async callbacks)
// to comply with MV3 service worker constraints.
//
// Responsibilities:
//   • Routes messages between popup ↔ offscreen ↔ content script
//   • Manages recording state (persisted in chrome.storage.session for crash recovery)
//   • Orchestrates auth (opens auth page, receives session token)
//   • Manages SW keepalive via chrome.alarms
//   • Updates extension badge to reflect recording status
//

import { MSG, type ExtensionMessage } from '../shared/types/messages';
import {
  RecordingState,
  RecordingMode,
  VideoQuality,
  type RecordingSession,
  type RecordingStateSnapshot,
} from '../shared/types/recording';
import type { ExtensionSession } from '../shared/types/user';
import { CONFIG } from '../shared/constants/config';
import { createLogger } from '../shared/utils/logger';
import { parseMessage, isInternalSender, isAllowedExternalOrigin } from '../shared/utils/validation';
import {
  getSession,
  persistRecordingSession,
  addRecentRecording,
  getSettings,
} from '../shared/utils/storage';

import { authManager } from './auth/auth-manager';
import { coordinator } from './recording/coordinator';
import { transition } from './recording/state-machine';
import { startKeepalive, stopKeepalive, handleAlarm } from './lifecycle/keepalive';
import { handleInstall, handleStartup, handleNotificationClick } from './lifecycle/install';

const logger = createLogger('Background');

// ─── Mutable State (in-memory, also persisted to storage.session) ─────────────

let recordingState: RecordingState = RecordingState.IDLE;
let recordingSession: RecordingSession | null = null;
let timerInterval: ReturnType<typeof setInterval> | null = null;

// ─── State Helpers ────────────────────────────────────────────────────────────

function getStateSnapshot(): RecordingStateSnapshot {
  let elapsed = 0;
  if (recordingSession) {
    if (recordingSession.state === RecordingState.RECORDING) {
      elapsed = Date.now() - recordingSession.startedAt - (recordingSession.totalPausedMs || 0);
    } else if (recordingSession.state === RecordingState.PAUSED) {
      const pausedAt = recordingSession.pausedAt || Date.now();
      elapsed = pausedAt - recordingSession.startedAt - (recordingSession.totalPausedMs || 0);
    }
  }
  return {
    state: recordingState,
    session: recordingSession,
    elapsedMs: Math.max(0, elapsed),
  };
}

async function applyTransition(next: RecordingState): Promise<void> {
  const result = transition(recordingState, next, recordingSession);
  recordingState = result.state;
  recordingSession = result.session;
  await persistRecordingSession(recordingSession);
  await updateBadge(recordingState);
  broadcastStateUpdate();
}

function broadcastStateUpdate(): void {
  const snapshot = getStateSnapshot();
  chrome.runtime.sendMessage({
    type: MSG.STATE_UPDATE,
    payload: { snapshot },
  } as ExtensionMessage).catch(() => {
    // Popup may not be open — that's fine
  });
}

// ─── Badge Updates ────────────────────────────────────────────────────────────

async function updateBadge(state: RecordingState): Promise<void> {
  const badges: Partial<Record<RecordingState, { text: string; color: string }>> = {
    [RecordingState.RECORDING]: { text: '●', color: '#ef4444' },
    [RecordingState.PAUSED]: { text: '⏸', color: '#f59e0b' },
    [RecordingState.UPLOADING]: { text: '↑', color: '#6366f1' },
    [RecordingState.UPLOADED]: { text: '✓', color: '#22c55e' },
    [RecordingState.FAILED]: { text: '!', color: '#ef4444' },
  };

  const badge = badges[state];
  if (badge) {
    await chrome.action.setBadgeText({ text: badge.text });
    await chrome.action.setBadgeBackgroundColor({ color: badge.color });
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
}

// ─── Timer (pushes elapsed time to content scripts) ──────────────────────────

function startTimer(): void {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    if (recordingState !== RecordingState.RECORDING) return;
    const snapshot = getStateSnapshot();
    // Notify all tabs running the content script
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: MSG.UPDATE_TIMER,
            payload: { elapsedMs: snapshot.elapsedMs },
          } as ExtensionMessage).catch(() => {});
        }
      }
    });
  }, 1000);
}

function stopTimer(): void {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ─── Content Script Broadcasting ─────────────────────────────────────────────

async function broadcastToAllTabs(message: ExtensionMessage): Promise<void> {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    }
  }
}

// ─── Message Handlers ─────────────────────────────────────────────────────────

async function handlePopupMessage(
  msg: ExtensionMessage,
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  switch (msg.type) {
    // ── Auth ───────────────────────────────────────────────────────────────
    case MSG.GET_AUTH: {
      const session = await getSession();
      return {
        authenticated: session !== null,
        user: session?.user ?? null,
      };
    }

    case MSG.OPEN_AUTH_PAGE: {
      await authManager.openAuthPage();
      return { success: true };
    }

    case MSG.LOGOUT: {
      await authManager.logout();
      return { success: true };
    }

    // ── State ──────────────────────────────────────────────────────────────
    case MSG.GET_STATE: {
      return getStateSnapshot();
    }

    // ── Recording ──────────────────────────────────────────────────────────
    case MSG.START_RECORDING: {
      if (recordingState !== RecordingState.IDLE && recordingState !== RecordingState.UPLOADED) {
        return { success: false, error: 'Already recording or uploading' };
      }

      const session = await getSession();
      if (!session) {
        await authManager.openAuthPage();
        return { success: false, error: 'Not authenticated' };
      }

      await applyTransition(RecordingState.PREPARING);

      const settings = await getSettings();
      const { mode, quality, audioDeviceId, includeMic } = {
        mode: msg.payload.mode,
        quality: msg.payload.quality ?? settings.quality as VideoQuality,
        audioDeviceId: msg.payload.audioDeviceId ?? settings.audioDeviceId,
        includeMic: msg.payload.includeMic ?? settings.includeMic,
      };

      try {
        // Get the active tab for stream acquisition
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab) throw new Error('No active tab found');

        const newSession = await coordinator.startRecording(
          mode,
          quality,
          audioDeviceId,
          includeMic,
          session.userId,
          activeTab
        );

        recordingSession = newSession;
        await applyTransition(RecordingState.RECORDING);

        startKeepalive();
        startTimer();

        // Show floating controls on the active tab
        if (activeTab.id) {
          chrome.tabs.sendMessage(activeTab.id, {
            type: MSG.SHOW_CONTROLS,
            payload: { 
              state: RecordingState.RECORDING,
              mode: newSession.mode,
              audioDeviceId: newSession.audioDeviceId,
            },
          } as ExtensionMessage).catch(() => {});
        }

        return { success: true, session: newSession };
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Recording failed to start';
        logger.error('Failed to start recording', err);
        await applyTransition(RecordingState.FAILED);
        if (recordingSession) {
          recordingSession = { ...recordingSession, error };
        }
        return { success: false, error };
      }
    }

    case MSG.STOP_RECORDING: {
      if (
        recordingState !== RecordingState.RECORDING &&
        recordingState !== RecordingState.PAUSED
      ) {
        return { success: false, error: 'Not recording' };
      }
      stopTimer();
      await coordinator.stopRecording();
      // Transition to UPLOADING happens when offscreen sends CAPTURE_STOPPED
      return { success: true };
    }

    case MSG.PAUSE_RECORDING: {
      if (recordingState !== RecordingState.RECORDING) {
        return { success: false, error: 'Not recording' };
      }
      await coordinator.pauseRecording();
      await applyTransition(RecordingState.PAUSED);
      await broadcastToAllTabs({
        type: MSG.SHOW_CONTROLS,
        payload: { state: RecordingState.PAUSED, mode: recordingSession?.mode },
      });
      return { success: true };
    }

    case MSG.RESUME_RECORDING: {
      if (recordingState !== RecordingState.PAUSED) {
        return { success: false, error: 'Not paused' };
      }
      await coordinator.resumeRecording();
      await applyTransition(RecordingState.RECORDING);
      await broadcastToAllTabs({
        type: MSG.SHOW_CONTROLS,
        payload: { state: RecordingState.RECORDING, mode: recordingSession?.mode },
      });
      return { success: true };
    }

    case MSG.CANCEL_RECORDING: {
      stopTimer();
      stopKeepalive();
      await coordinator.stopRecording().catch(() => {});
      await applyTransition(RecordingState.CANCELLED);
      await applyTransition(RecordingState.IDLE);
      await coordinator.cleanupOffscreen();
      await broadcastToAllTabs({ type: MSG.HIDE_CONTROLS });
      return { success: true };
    }

    case MSG.GET_RECENT_RECORDINGS: {
      const { getRecentRecordings } = await import('../shared/utils/storage');
      return getRecentRecordings();
    }

    case MSG.GET_AUDIO_DEVICES: {
      // Devices are enumerated in the offscreen document context
      // For the popup we return cached settings
      const settings = await getSettings();
      return { audioDeviceId: settings.audioDeviceId };
    }

    case MSG.OPEN_DASHBOARD: {
      chrome.tabs.create({ url: CONFIG.DASHBOARD_URL });
      return { success: true };
    }

    default:
      return null;
  }
}

async function handleOffscreenMessage(msg: ExtensionMessage): Promise<void> {
  switch (msg.type) {
    case MSG.CAPTURE_STARTED: {
      logger.info('Capture started in offscreen', { filename: msg.payload.filename });
      break;
    }

    case MSG.CHUNK_READY: {
      if (recordingSession) {
        recordingSession.chunkCount = msg.payload.chunkIndex + 1;
        recordingSession.totalBytes += msg.payload.size;
        await persistRecordingSession(recordingSession);

        // Check FREE plan time limit (matches desktop app's 5-min limit)
        const session = await getSession();
        if (session?.user.plan === 'FREE' && recordingSession) {
          const elapsedMs = Date.now() - recordingSession.startedAt - recordingSession.totalPausedMs;
          if (elapsedMs >= CONFIG.FREE_PLAN_MAX_MINUTES * 60 * 1000) {
            logger.info('FREE plan time limit reached — stopping recording');
            await coordinator.stopRecording();
          }
        }
      }
      break;
    }

    case MSG.CAPTURE_STOPPED: {
      logger.info('Capture stopped, transitioning to UPLOADING', msg.payload);
      stopTimer();
      await applyTransition(RecordingState.UPLOADING);

      await broadcastToAllTabs({
        type: MSG.SHOW_CONTROLS,
        payload: { state: RecordingState.UPLOADING },
      });
      break;
    }

    case MSG.UPLOAD_PROGRESS: {
      if (recordingSession) {
        recordingSession.uploadProgress = msg.payload.percent;
        broadcastStateUpdate();
      }
      break;
    }

    case MSG.UPLOAD_COMPLETE: {
      logger.info('Upload complete');

      if (recordingSession) {
        await addRecentRecording({
          id: recordingSession.id,
          filename: recordingSession.filename,
          duration: Math.floor(
            (Date.now() - recordingSession.startedAt - recordingSession.totalPausedMs) / 1000
          ),
          completedAt: Date.now(),
          mode: recordingSession.mode,
        });
      }

      await applyTransition(RecordingState.UPLOADED);
      stopKeepalive();
      await coordinator.cleanupOffscreen();
      await broadcastToAllTabs({ type: MSG.HIDE_CONTROLS });

      // Show completion notification
      chrome.notifications.create('upload-complete', {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icons/icon-48.png'),
        title: 'ClipIQ — Recording uploaded! 🎉',
        message: 'Your recording is being processed. View it in your dashboard.',
        buttons: [{ title: 'Open Dashboard' }],
        priority: 1,
      });

      // Auto-reset to IDLE after 5s
      setTimeout(() => {
        if (recordingState === RecordingState.UPLOADED) {
          recordingState = RecordingState.IDLE;
          recordingSession = null;
          persistRecordingSession(null);
          updateBadge(RecordingState.IDLE);
          broadcastStateUpdate();
        }
      }, 5000);

      break;
    }

    case MSG.CAPTURE_ERROR: {
      logger.error('Capture error from offscreen', msg.payload);
      stopTimer();
      stopKeepalive();
      await applyTransition(RecordingState.FAILED);
      if (recordingSession) {
        recordingSession = { ...recordingSession, error: msg.payload.message };
      }
      await coordinator.cleanupOffscreen();
      await broadcastToAllTabs({ type: MSG.HIDE_CONTROLS });
      break;
    }

    default:
      break;
  }
}

// ─── Main Message Router ──────────────────────────────────────────────────────
// MUST be registered at top-level — this is the MV3 rule

chrome.runtime.onMessage.addListener(
  (rawMessage: unknown, sender: chrome.runtime.MessageSender, sendResponse: (r: unknown) => void) => {
    if (!isInternalSender(sender)) {
      logger.warn('Rejected message from external sender', { id: sender.id });
      return false;
    }

    const msg = parseMessage(rawMessage);
    if (!msg) {
      logger.warn('Failed to parse message', rawMessage);
      return false;
    }

    // Offscreen messages don't have tab context and originate from offscreen.html
    const isFromOffscreen = sender.url?.includes('offscreen.html');
    // Popup messages have no tab but originate from popup.html
    // Content script messages have sender.tab defined

    if (isFromOffscreen) {
      // Messages from offscreen document
      handleOffscreenMessage(msg).catch((err) =>
        logger.error('handleOffscreenMessage error', err)
      );
    } else {
      // Messages from popup or content script (expect response)
      handlePopupMessage(msg, sender)
        .then(sendResponse)
        .catch((err) => {
          logger.error('handlePopupMessage error', err);
          sendResponse({ success: false, error: String(err) });
        });
      return true; // Keep channel open for async response
    }

    return false;
  }
);

// ─── External Messages (Auth Bridge from clipiq.vercel.app) ──────────────────
// Receives { type: 'AUTH_SUCCESS', payload: { userId, token, expiresAt, user } }
// from the /extension-auth page via chrome.runtime.sendMessage(extensionId, ...)

chrome.runtime.onMessageExternal?.addListener(
  (rawMessage: unknown, sender: chrome.runtime.MessageSender, sendResponse: (r: unknown) => void) => {
    if (!isAllowedExternalOrigin(sender.origin)) {
      logger.warn('Rejected external message from', { origin: sender.origin });
      sendResponse({ success: false, error: 'Origin not allowed' });
      return false;
    }

    const msg = parseMessage(rawMessage);
    if (!msg) {
      sendResponse({ success: false, error: 'Invalid message' });
      return false;
    }

    if (msg.type === MSG.AUTH_SUCCESS) {
      const session: ExtensionSession = {
        userId: msg.payload.user.id,
        clerkId: msg.payload.user.clerkid,
        token: msg.payload.token,
        expiresAt: msg.payload.expiresAt,
        user: msg.payload.user,
      };
      authManager.storeSession(session).then(() => {
        sendResponse({ success: true });
        // Notify popup if open
        chrome.runtime.sendMessage({
          type: MSG.AUTH_UPDATE,
          payload: { authenticated: true, user: session.user },
        } as ExtensionMessage).catch(() => {});
      });
      return true;
    }

    sendResponse({ success: false, error: 'Unknown external message type' });
    return false;
  }
);

// ─── Alarm Listener — MUST be top-level ──────────────────────────────────────

chrome.alarms.onAlarm.addListener((alarm) => {
  if (handleAlarm(alarm)) {
    // Keepalive handled — optionally ping offscreen to verify health
    if (recordingState === RecordingState.RECORDING) {
      logger.debug('SW alive during recording — keepalive tick');
    }
  }
});

// ─── Lifecycle Listeners — MUST be top-level ─────────────────────────────────

chrome.runtime.onInstalled.addListener(handleInstall);
chrome.runtime.onStartup.addListener(handleStartup);

// Helper to gracefully inject and show controls
async function ensureControlsOnTab(tabId: number, tabUrl?: string) {
  if (!tabUrl || tabUrl.startsWith('chrome://') || tabUrl.startsWith('edge://')) return;
  if (
    recordingState !== RecordingState.RECORDING &&
    recordingState !== RecordingState.PAUSED &&
    recordingState !== RecordingState.UPLOADING
  ) return;

  const payload = {
    state: recordingState,
    mode: recordingSession?.mode,
    audioDeviceId: recordingSession?.audioDeviceId,
  };

  try {
    // Try sending first; if content script exists, this works
    await chrome.tabs.sendMessage(tabId, { type: MSG.SHOW_CONTROLS, payload } as ExtensionMessage);
  } catch (err) {
    // If it fails, the script is missing (tab loaded before extension). Dynamically inject!
    try {
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['src/content/styles/content.css']
      });
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/content.js']
      });
      // Try sending again after injection
      await chrome.tabs.sendMessage(tabId, { type: MSG.SHOW_CONTROLS, payload } as ExtensionMessage);
    } catch (injectErr) {
      logger.error('Failed to dynamically inject content script', injectErr);
    }
  }
}

// Re-inject controls if a user navigates or opens a new tab during an active recording
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    ensureControlsOnTab(tabId, tab.url);
  }
});

// Show controls immediately when switching to an already opened tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    ensureControlsOnTab(activeInfo.tabId, tab.url);
  } catch (err) {
    // Ignore errors if tab doesn't exist
  }
});

chrome.notifications.onClicked?.addListener(handleNotificationClick);
chrome.notifications.onButtonClicked?.addListener((notificationId, buttonIndex) => {
  if (notificationId === 'upload-complete' && buttonIndex === 0) {
    chrome.tabs.create({ url: CONFIG.DASHBOARD_URL });
    chrome.notifications.clear(notificationId);
  }
});

// ─── Keyboard Shortcuts ──────────────────────────────────────────────────────
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-recording') {
    if (recordingState === RecordingState.RECORDING || recordingState === RecordingState.PAUSED) {
      handlePopupMessage({ type: MSG.STOP_RECORDING } as ExtensionMessage, {} as any).catch(logger.error);
    } else if (recordingState === RecordingState.IDLE || recordingState === RecordingState.UPLOADED) {
      // Start recording with defaults (Camera & Screen usually, or last used mode)
      handlePopupMessage({ 
        type: MSG.START_RECORDING, 
        payload: { mode: RecordingMode.TAB } // Defaulting to tab for shortcut to avoid permission popups instantly
      } as ExtensionMessage, {} as any).catch(logger.error);
    }
  } else if (command === 'toggle-pause') {
    if (recordingState === RecordingState.RECORDING) {
      handlePopupMessage({ type: MSG.PAUSE_RECORDING } as ExtensionMessage, {} as any).catch(logger.error);
    } else if (recordingState === RecordingState.PAUSED) {
      handlePopupMessage({ type: MSG.RESUME_RECORDING } as ExtensionMessage, {} as any).catch(logger.error);
    }
  }
});

// ─── Icon click — open popup ─────────────────────────────────────────────────
// The popup is set via action.default_popup in manifest, so this is only for
// programmatic badge behavior. No need for explicit handler.

logger.info('Background service worker initialized', {
  version: chrome.runtime.getManifest().version,
});
