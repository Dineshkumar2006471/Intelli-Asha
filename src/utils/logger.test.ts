import { describe, it, expect, vi } from 'vitest';
import { createLogger } from './logger';

describe('Logger', () => {
  it('should create a logger with the correct tag', () => {
    const log = createLogger('TEST_TAG');
    expect(log).toHaveProperty('info');
    expect(log).toHaveProperty('warn');
    expect(log).toHaveProperty('error');
  });

  it('should log to console.info', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const log = createLogger('TEST_TAG');
    
    log.info('Hello world');
    
    expect(consoleSpy).toHaveBeenCalled();
    const logMessage = consoleSpy.mock.calls[0]?.[0] as string;
    expect(logMessage).toContain('[INFO]');
    expect(logMessage).toContain('[TEST_TAG]');
    expect(logMessage).toContain('Hello world');
    
    consoleSpy.mockRestore();
  });
});
