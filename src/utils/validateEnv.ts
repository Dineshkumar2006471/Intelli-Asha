/**
 * IntelliASHA — Environment Variable Validation
 *
 * Runs at application startup before React mounts.
 * Throws a clear, developer-friendly error if any required variable is missing.
 */

const REQUIRED_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_GEMINI_API_KEY',
] as const;

/**
 * Validates that all required `VITE_*` environment variables are set.
 * Call this once in `main.tsx` before rendering the React tree.
 *
 * @throws {Error} Lists every missing variable in a single, actionable message.
 */
export function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter(
    (key) => !import.meta.env[key] || import.meta.env[key] === ''
  );

  if (missing.length > 0) {
    throw new Error(
      `[IntelliASHA] Missing required environment variables:\n` +
      missing.map((v) => `  - ${v}`).join('\n') +
      `\n\nCopy .env.example to .env and fill in the values.`
    );
  }
}
