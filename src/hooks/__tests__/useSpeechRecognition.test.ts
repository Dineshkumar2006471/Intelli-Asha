import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSpeechRecognition } from '../useSpeechRecognition';

describe('useSpeechRecognition hook', () => {
  let mockRecognitionInstance: {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    onresult: ((e: unknown) => void) | null;
    onerror: ((e: unknown) => void) | null;
    onend: (() => void) | null;
  };

  beforeEach(() => {
    mockRecognitionInstance = {
      continuous: false,
      interimResults: false,
      lang: '',
      start: vi.fn(),
      stop: vi.fn(),
      onresult: null,
      onerror: null,
      onend: null,
    };

    class MockSpeechRecognition {
      constructor() {
        return mockRecognitionInstance;
      }
    }

    Object.defineProperty(window, 'SpeechRecognition', {
      value: MockSpeechRecognition,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with correct support status when SpeechRecognition is present', () => {
    const { result } = renderHook(() => useSpeechRecognition('en-IN'));
    expect(result.current.isSupported).toBe(true);
    expect(result.current.isRecording).toBe(false);
    expect(result.current.transcription).toBe('');
    expect(result.current.error).toBeNull();
  });

  it('should flag unsupported browser when SpeechRecognition is missing', () => {
    Object.defineProperty(window, 'SpeechRecognition', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useSpeechRecognition('en-IN'));
    expect(result.current.isSupported).toBe(false);
    expect(result.current.error).toContain('not supported');
  });

  it('should start recording when startRecording is called', () => {
    const { result } = renderHook(() => useSpeechRecognition('en-IN'));

    act(() => {
      result.current.startRecording();
    });

    expect(mockRecognitionInstance.start).toHaveBeenCalled();
    expect(result.current.isRecording).toBe(true);
  });

  it('should handle speech recognition errors gracefully', () => {
    const { result } = renderHook(() => useSpeechRecognition('en-IN'));

    act(() => {
      result.current.startRecording();
    });

    act(() => {
      if (mockRecognitionInstance.onerror) {
        mockRecognitionInstance.onerror({ error: 'not-allowed' });
      }
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toBe('Microphone error: not-allowed');
  });
});
