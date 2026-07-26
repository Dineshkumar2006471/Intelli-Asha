import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger } from '../logger';

describe('createLogger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a logger with info, warn, and error methods', () => {
    const log = createLogger('TEST');
    expect(typeof log.info).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.error).toBe('function');
  });

  it('should call console.info with formatted tag for info()', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const log = createLogger('MY_MODULE');

    log.info('Hello world');

    expect(spy).toHaveBeenCalledOnce();
    const formatted = spy.mock.calls[0]?.[0] as string;
    expect(formatted).toContain('[INFO]');
    expect(formatted).toContain('[MY_MODULE]');
    expect(formatted).toContain('Hello world');
  });

  it('should call console.warn with formatted tag for warn()', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = createLogger('FIREBASE');

    log.warn('Connection lost');

    expect(spy).toHaveBeenCalledOnce();
    const formatted = spy.mock.calls[0]?.[0] as string;
    expect(formatted).toContain('[WARN]');
    expect(formatted).toContain('[FIREBASE]');
  });

  it('should call console.error with formatted tag for error()', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = createLogger('DB');

    log.error('Query failed', new Error('timeout'));

    expect(spy).toHaveBeenCalledOnce();
    const formatted = spy.mock.calls[0]?.[0] as string;
    expect(formatted).toContain('[ERROR]');
    expect(formatted).toContain('[DB]');
    expect(formatted).toContain('Query failed');
  });

  it('should include ISO timestamp in log output', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const log = createLogger('TIME_TEST');

    log.info('timestamp check');

    const formatted = spy.mock.calls[0]?.[0] as string;
    // ISO 8601 pattern: YYYY-MM-DDTHH:mm:ss
    expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should pass data as second argument to console methods', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const log = createLogger('DATA_TEST');
    const data = { userId: '123', action: 'login' };

    log.info('User logged in', data);

    expect(spy).toHaveBeenCalledWith(expect.any(String), data);
  });
});
