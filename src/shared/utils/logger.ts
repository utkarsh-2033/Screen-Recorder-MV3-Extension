// Structured logger — verbose in dev, minimal in prod
// Mirrors desktop app's console pattern but adds context tags.

declare const __DEV__: boolean;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
  timestamp: number;
}

const LOG_PREFIX = '[ClipIQ]';
const MAX_LOG_BUFFER = 100; // Keep last 100 log entries for debugging

// In-memory ring buffer for debugging
const logBuffer: LogEntry[] = [];

function writeLog(level: LogLevel, context: string, message: string, data?: unknown): void {
  const entry: LogEntry = {
    level,
    context,
    message,
    data,
    timestamp: Date.now(),
  };

  // Maintain ring buffer
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_BUFFER) {
    logBuffer.shift();
  }

  const prefix = `${LOG_PREFIX} [${context}]`;

  if (__DEV__) {
    switch (level) {
      case 'debug':
        console.debug(prefix, message, data ?? '');
        break;
      case 'info':
        console.info(prefix, message, data ?? '');
        break;
      case 'warn':
        console.warn(prefix, message, data ?? '');
        break;
      case 'error':
        console.error(prefix, message, data ?? '');
        break;
    }
  } else {
    // Production: only errors and warnings
    if (level === 'error') {
      console.error(prefix, message, data ?? '');
    } else if (level === 'warn') {
      console.warn(prefix, message, data ?? '');
    }
  }
}

export function createLogger(context: string) {
  return {
    debug: (message: string, data?: unknown) => writeLog('debug', context, message, data),
    info: (message: string, data?: unknown) => writeLog('info', context, message, data),
    warn: (message: string, data?: unknown) => writeLog('warn', context, message, data),
    error: (message: string, data?: unknown) => writeLog('error', context, message, data),
  };
}

export function getLogBuffer(): LogEntry[] {
  return [...logBuffer];
}

export type Logger = ReturnType<typeof createLogger>;
