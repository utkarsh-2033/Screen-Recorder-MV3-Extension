// Recording state machine — pure functional transitions with no side effects

import { RecordingState, type RecordingSession } from '../../shared/types/recording';
import { createLogger } from '../../shared/utils/logger';

const logger = createLogger('StateMachine');

// Valid transitions: from → Set<to>
const VALID_TRANSITIONS: Partial<Record<RecordingState, Set<RecordingState>>> = {
  [RecordingState.IDLE]: new Set([RecordingState.PREPARING]),
  [RecordingState.PREPARING]: new Set([
    RecordingState.PERMISSION,
    RecordingState.RECORDING,
    RecordingState.FAILED,
    RecordingState.CANCELLED,
  ]),
  [RecordingState.PERMISSION]: new Set([
    RecordingState.RECORDING,
    RecordingState.FAILED,
    RecordingState.CANCELLED,
  ]),
  [RecordingState.RECORDING]: new Set([
    RecordingState.PAUSED,
    RecordingState.UPLOADING,
    RecordingState.FAILED,
    RecordingState.CANCELLED,
  ]),
  [RecordingState.PAUSED]: new Set([
    RecordingState.RECORDING,
    RecordingState.UPLOADING,
    RecordingState.CANCELLED,
  ]),
  [RecordingState.UPLOADING]: new Set([
    RecordingState.UPLOADED,
    RecordingState.FAILED,
    RecordingState.RECOVERED,
  ]),
  [RecordingState.UPLOADED]: new Set([RecordingState.IDLE, RecordingState.PREPARING]),
  [RecordingState.FAILED]: new Set([RecordingState.IDLE, RecordingState.PREPARING]),
  [RecordingState.CANCELLED]: new Set([RecordingState.IDLE]),
  [RecordingState.RECOVERED]: new Set([RecordingState.UPLOADING, RecordingState.FAILED]),
};

export function canTransition(from: RecordingState, to: RecordingState): boolean {
  return VALID_TRANSITIONS[from]?.has(to) ?? false;
}

export function transition(
  current: RecordingState,
  next: RecordingState,
  session: RecordingSession | null
): { state: RecordingState; session: RecordingSession | null } {
  if (!canTransition(current, next)) {
    logger.warn(`Invalid transition: ${current} → ${next}`);
    return { state: current, session };
  }

  logger.info(`Transition: ${current} → ${next}`);

  const now = Date.now();
  let updatedSession = session;

  if (updatedSession) {
    updatedSession = { ...updatedSession, state: next };

    if (next === RecordingState.PAUSED) {
      updatedSession.pausedAt = now;
    }

    if (next === RecordingState.RECORDING && session?.state === RecordingState.PAUSED) {
      const pausedDuration = session.pausedAt ? now - session.pausedAt : 0;
      updatedSession.totalPausedMs = (updatedSession.totalPausedMs ?? 0) + pausedDuration;
      updatedSession.pausedAt = undefined;
    }

    if (next === RecordingState.IDLE || next === RecordingState.CANCELLED) {
      updatedSession = null; // Clear session when done
    }
  }

  return { state: next, session: updatedSession };
}
