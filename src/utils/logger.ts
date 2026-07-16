/**
 * IntelliASHA — Structured Logger
 *
 * Replaces bare console.error calls with a tagged, levelled logging utility.
 * In production, this can be extended to ship logs to Cloud Logging.
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  tag: string;
  message: string;
  data?: unknown;
  timestamp: string;
}

function formatEntry(entry: LogEntry): string {
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.tag}] ${entry.message}`;
}

function createEntry(level: LogLevel, tag: string, message: string, data?: unknown): LogEntry {
  return {
    level,
    tag,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates a scoped logger instance for a specific module.
 *
 * @example
 * ```ts
 * const log = createLogger('FIELD_AGENT');
 * log.info('Voice note processed');
 * log.error('Gemini API failed', error);
 * ```
 */
export function createLogger(tag: string) {
  return {
    info(message: string, data?: unknown) {
      const entry = createEntry('info', tag, message, data);
      console.info(formatEntry(entry), data ?? '');
    },
    warn(message: string, data?: unknown) {
      const entry = createEntry('warn', tag, message, data);
      console.warn(formatEntry(entry), data ?? '');
    },
    error(message: string, data?: unknown) {
      const entry = createEntry('error', tag, message, data);
      console.error(formatEntry(entry), data ?? '');
    },
  };
}
