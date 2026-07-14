// Install/update/startup lifecycle handlers

import { CONFIG } from '../../shared/constants/config';
import { createLogger } from '../../shared/utils/logger';
import { getPersistedRecordingSession } from '../../shared/utils/storage';
import { RecordingState } from '../../shared/types/recording';

const logger = createLogger('Install');

export function handleInstall(details: chrome.runtime.InstalledDetails): void {
  logger.info('Extension installed/updated', { reason: details.reason });

  if (details.reason === 'install') {
    // First install: open welcome/onboarding page
    chrome.tabs.create({ url: `${CONFIG.HOST_URL}/extension-auth` });
  }

  if (details.reason === 'update') {
    logger.info('Extension updated to', { version: chrome.runtime.getManifest().version });
    // On update: check if there was an interrupted recording
    checkForInterruptedRecording();
  }
}

export function handleStartup(): void {
  logger.info('Browser started — checking for interrupted recordings');
  checkForInterruptedRecording();
}

async function checkForInterruptedRecording(): Promise<void> {
  const session = await getPersistedRecordingSession();

  if (
    session &&
    (session.state === RecordingState.RECORDING ||
      session.state === RecordingState.PAUSED ||
      session.state === RecordingState.UPLOADING)
  ) {
    logger.warn('Found interrupted recording session', {
      filename: session.filename,
      state: session.state,
      chunkCount: session.chunkCount,
    });

    // Notify user via notification
    chrome.notifications.create('interrupted-recording', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('assets/icons/icon-48.png'),
      title: 'ClipIQ — Recording interrupted',
      message: `A recording was interrupted. ${session.chunkCount} chunks were captured.`,
      buttons: [{ title: 'Dismiss' }],
      priority: 2,
    });
  }
}

export function handleNotificationClick(notificationId: string): void {
  if (notificationId === 'interrupted-recording') {
    chrome.notifications.clear(notificationId);
  }
}
