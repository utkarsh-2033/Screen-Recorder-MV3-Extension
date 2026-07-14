// Session management — stores/retrieves auth tokens from chrome.storage.session
// Tokens are cleared when browser restarts (session storage).
// Uses externally_connectable to receive auth from the ClipIQ web app.

import { CONFIG } from '../../shared/constants/config';
import type { ExtensionSession } from '../../shared/types/user';
import {
  getSession,
  setSession,
  clearSession,
  isSessionValid,
} from '../../shared/utils/storage';
import { createLogger } from '../../shared/utils/logger';

const logger = createLogger('AuthManager');

let authTabId: number | null = null; // Track the auth tab so we can close it

export class AuthManager {
  /**
   * Open the extension-auth page in the ClipIQ web app.
   * The page uses Clerk to authenticate, then sends the session token
   * back to the extension via chrome.runtime.sendMessage (externally_connectable).
   */
  async openAuthPage(): Promise<void> {
    logger.info('Opening auth page', { url: CONFIG.EXTENSION_AUTH_URL });

    // Close any existing auth tab
    if (authTabId !== null) {
      try {
        await chrome.tabs.remove(authTabId);
      } catch {
        // Tab may already be closed
      }
      authTabId = null;
    }

    const authUrl = new URL(CONFIG.EXTENSION_AUTH_URL);
    authUrl.searchParams.set('extId', chrome.runtime.id);

    const tab = await chrome.tabs.create({
      url: authUrl.toString(),
      active: true,
    });

    authTabId = tab.id ?? null;
    logger.info('Auth tab opened', { tabId: authTabId });
  }

  /**
   * Store the session received from the auth bridge page.
   * Called by background.ts when it receives MSG.AUTH_SUCCESS.
   */
  async storeSession(session: ExtensionSession): Promise<void> {
    await setSession(session);
    logger.info('Session stored', {
      userId: session.userId,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });

    // Close the auth tab automatically
    if (authTabId !== null) {
      try {
        await chrome.tabs.remove(authTabId);
        logger.info('Auth tab closed');
      } catch {
        // Already closed
      }
      authTabId = null;
    }
  }

  /**
   * Get the current valid session, or null if not authenticated / expired.
   */
  async getValidSession(): Promise<ExtensionSession | null> {
    const valid = await isSessionValid();
    if (!valid) {
      logger.debug('No valid session found');
      return null;
    }
    return getSession();
  }

  /**
   * Check if we need to refresh the session (expiry within threshold).
   */
  async needsRefresh(): Promise<boolean> {
    const session = await getSession();
    if (!session) return true;
    const timeLeft = session.expiresAt - Date.now();
    return timeLeft < CONFIG.TOKEN_REFRESH_THRESHOLD_MS;
  }

  /**
   * Silently re-authenticate if the session is expiring.
   * If the user is still signed in to Clerk, the auth page will
   * auto-complete and close without user interaction.
   */
  async silentRefresh(): Promise<void> {
    logger.info('Initiating silent session refresh');
    await this.openAuthPage();
  }

  /**
   * Logout — clear session and notify all extension contexts.
   */
  async logout(): Promise<void> {
    await clearSession();
    logger.info('Session cleared — user logged out');
  }
}

export const authManager = new AuthManager();
