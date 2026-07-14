import { useState, useEffect, useCallback } from 'react';
import { MSG } from '../../shared/types/messages';
import type { ExtensionUser } from '../../shared/types/user';

interface AuthState {
  authenticated: boolean;
  user: ExtensionUser | null;
  isLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    authenticated: false,
    user: null,
    isLoading: true,
  });

  const fetchAuth = useCallback(async () => {
    try {
      const result = await chrome.runtime.sendMessage({ type: MSG.GET_AUTH });
      if (result) {
        setAuthState({
          authenticated: result.authenticated,
          user: result.user,
          isLoading: false,
        });
      }
    } catch {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    fetchAuth();

    // Listen for auth updates pushed from background (after auth page completes)
    const listener = (msg: unknown) => {
      if (
        typeof msg === 'object' &&
        msg !== null &&
        'type' in msg &&
        (msg as { type: string }).type === MSG.AUTH_UPDATE
      ) {
        const payload = (msg as any as { payload: { authenticated: boolean; user: ExtensionUser | null } }).payload;
        setAuthState({ authenticated: payload.authenticated, user: payload.user, isLoading: false });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [fetchAuth]);

  const openAuthPage = useCallback(async () => {
    await chrome.runtime.sendMessage({ type: MSG.OPEN_AUTH_PAGE });
  }, []);

  const logout = useCallback(async () => {
    await chrome.runtime.sendMessage({ type: MSG.LOGOUT });
    setAuthState({ authenticated: false, user: null, isLoading: false });
  }, []);

  return {
    ...authState,
    openAuthPage,
    logout,
    refetch: fetchAuth,
  };
}
