// Keepalive mechanism for the MV3 service worker.
// Chrome terminates idle SWs after ~30s. During recording, we use
// chrome.alarms to periodically wake the SW and verify offscreen health.

import { CONFIG } from '../../shared/constants/config';
import { createLogger } from '../../shared/utils/logger';

const logger = createLogger('Keepalive');

/**
 * Start periodic alarm to keep SW alive during recording.
 * The alarm fires every ~24 seconds, waking the SW.
 */
export function startKeepalive(): void {
  chrome.alarms.create(CONFIG.KEEPALIVE_ALARM_NAME, {
    periodInMinutes: CONFIG.KEEPALIVE_INTERVAL_MINUTES,
  });
  logger.debug('Keepalive alarm started');
}

/**
 * Stop the keepalive alarm when not recording.
 */
export function stopKeepalive(): void {
  chrome.alarms.clear(CONFIG.KEEPALIVE_ALARM_NAME, (wasCleared) => {
    if (wasCleared) {
      logger.debug('Keepalive alarm stopped');
    }
  });
}

/**
 * Handle alarm events. Must be registered at top-level in SW (not in async callbacks).
 * Returns true if it handled the alarm.
 */
export function handleAlarm(alarm: chrome.alarms.Alarm): boolean {
  if (alarm.name === CONFIG.KEEPALIVE_ALARM_NAME) {
    logger.debug('Keepalive tick — SW is alive');
    return true;
  }
  return false;
}
