// User profile stored in extension session (mirrors /api/auth/{clerkId} response)

export interface ExtensionUser {
  id: string;                     // Internal DB UUID (used as userId in upload calls)
  clerkid: string;                // Clerk's user ID
  email: string;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  plan: 'FREE' | 'PRO';
  workspaceId: string;            // Default workspace for recording placement
}

// Token stored in chrome.storage.session (cleared on browser restart)
export interface ExtensionSession {
  userId: string;                 // DB UUID — used in socket.emit("process-video", { userId })
  clerkId: string;
  token: string;                  // Short-lived opaque token for API auth
  expiresAt: number;              // Unix timestamp ms
  user: ExtensionUser;
}

export const SESSION_KEY = 'clipiq_session' as const;
export const RECORDINGS_KEY = 'clipiq_recent_recordings' as const;
export const SETTINGS_KEY = 'clipiq_settings' as const;

export interface ExtensionSettings {
  quality: import('./recording').VideoQuality;
  includeMic: boolean;
  audioDeviceId?: string;
  preferredMode: import('./recording').RecordingMode;
  showFloatingControls: boolean;
}
