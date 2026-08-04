/**
 * IntelliASHA — Structured Error Types
 *
 * Centralised error classification for consistent error handling
 * across the frontend and backend. Enables structured logging,
 * user-friendly messages, and error-code-based alerting.
 */

/** Error codes used across the IntelliASHA platform. */
export enum ErrorCode {
  NETWORK = 'NETWORK_ERROR',
  AUTH = 'AUTH_ERROR',
  AI_PROCESSING = 'AI_PROCESSING_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  FIRESTORE = 'FIRESTORE_ERROR',
  GEOLOCATION = 'GEOLOCATION_ERROR',
  SPEECH = 'SPEECH_RECOGNITION_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for IntelliASHA.
 *
 * Wraps native errors with a machine-readable `code` and an optional
 * `details` bag for structured logging and telemetry.
 *
 * @example
 * ```ts
 * throw new IntelliASHAError(
 *   ErrorCode.AI_PROCESSING,
 *   'Gemini failed to parse the voice transcription',
 *   { transcriptionLength: 142 }
 * );
 * ```
 */
export class IntelliASHAError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'IntelliASHAError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, IntelliASHAError.prototype);
  }

  /** Serialise for structured logging. */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Type-guard to narrow an unknown caught value into a standard Error.
 * Prevents the need for bare `any` in catch blocks.
 */
export function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === 'string') return new Error(value);
  return new Error(String(value));
}
