import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSpeechRecognition } from '../useSpeechRecognition';

vi.mock('firebase/functions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/functions')>();
  return {
    ...actual,
    getFunctions: vi.fn(),
    httpsCallable: vi.fn(),
  };
});

describe('useSpeechRecognition hook', () => {
  let mockGetUserMedia: any;
  let mockMediaRecorderStart: any;
  let mockMediaRecorderStop: any;

  beforeEach(() => {
    mockGetUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    });
    mockMediaRecorderStart = vi.fn();
    mockMediaRecorderStop = vi.fn();

    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
      },
      configurable: true,
      writable: true,
    });

    class MockMediaRecorder {
      static isTypeSupported = vi.fn().mockReturnValue(true);
      start = mockMediaRecorderStart;
      stop = mockMediaRecorderStop;
      ondataavailable: any = null;
      onstop: any = null;
      state = 'inactive';
      
      constructor(_stream: any, _options: any) {
        // mock constructor
      }
    }

    Object.defineProperty(window, 'MediaRecorder', {
      value: MockMediaRecorder,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with correct support status when mediaDevices is present', () => {
    const { result } = renderHook(() => useSpeechRecognition('en-IN'));
    expect(result.current.isSupported).toBe(true);
    expect(result.current.isRecording).toBe(false);
    expect(result.current.transcription).toBe('');
    expect(result.current.error).toBeNull();
  });

  it('should flag unsupported browser when mediaDevices is missing', () => {
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useSpeechRecognition('en-IN'));
    expect(result.current.isSupported).toBe(false);
  });

  it('should start recording when startRecording is called', async () => {
    const { result } = renderHook(() => useSpeechRecognition('en-IN'));

    act(() => {
      result.current.startRecording();
    });

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
      expect(mockMediaRecorderStart).toHaveBeenCalled();
    });
    
    expect(result.current.isRecording).toBe(true);
  });

  it('should handle microphone access errors gracefully', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('not-allowed'));
    const { result } = renderHook(() => useSpeechRecognition('en-IN'));

    act(() => {
      result.current.startRecording();
    });

    await waitFor(() => {
      expect(result.current.isRecording).toBe(false);
      expect(result.current.error).toContain('denied');
    });
  });
});
