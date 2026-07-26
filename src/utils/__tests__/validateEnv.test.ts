import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateEnv } from '../validateEnv';

describe('validateEnv', () => {
  beforeEach(() => {
    // Set all required vars to valid values using official Vitest env stubbing
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-key');
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project');
    vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', 'test.appspot.com');
    vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', '123456');
    vi.stubEnv('VITE_FIREBASE_APP_ID', '1:123:web:abc');
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-gemini-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should not throw when all required vars are present', () => {
    expect(() => validateEnv()).not.toThrow();
  });

  it('should throw when VITE_GEMINI_API_KEY is missing', () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', '');
    expect(() => validateEnv()).toThrow('VITE_GEMINI_API_KEY');
  });

  it('should throw when multiple vars are missing', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', '');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '');
    expect(() => validateEnv()).toThrow('VITE_FIREBASE_API_KEY');
    expect(() => validateEnv()).toThrow('VITE_FIREBASE_PROJECT_ID');
  });
});
