import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGeolocation } from '../useGeolocation';
import { httpsCallable } from 'firebase/functions';

vi.mock('firebase/functions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/functions')>();
  return {
    ...actual,
    getFunctions: vi.fn(),
    httpsCallable: vi.fn(),
  };
});

describe('useGeolocation hook', () => {
  const mockGetCurrentPosition = vi.fn();
  const mockHttpsCallable = vi.mocked(httpsCallable);

  beforeEach(() => {
    vi.resetAllMocks();
    
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: {
        getCurrentPosition: mockGetCurrentPosition,
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle geolocation not supported', async () => {
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useGeolocation({ fallback: 'Test Fallback' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.locationName).toBe('Test Fallback');
    expect(result.current.error).toBe('Geolocation not supported');
    expect(result.current.geoAnchor).toBeNull();
  });

  it('should successfully resolve coordinates and reverse geocode at zoom 10', async () => {
    mockGetCurrentPosition.mockImplementationOnce((success) => {
      success({
        coords: {
          latitude: 28.6139,
          longitude: 77.209,
          accuracy: 15,
        },
      });
    });

    const mockFunction = vi.fn().mockResolvedValue({
      data: {
        success: true,
        data: [{
          address_components: [
            { types: ['locality'], long_name: 'New Delhi' }
          ]
        }]
      }
    });
    mockHttpsCallable.mockReturnValue(mockFunction as any);

    const { result } = renderHook(() => useGeolocation({ zoom: 10 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.locationName).toBe('Delhi Division District');
    expect(result.current.geoAnchor).toEqual({
      lat: 28.6139,
      lng: 77.209,
      accuracy: 15,
    });
    expect(result.current.error).toBeNull();
  });

  it('should handle geolocation permission denied', async () => {
    mockGetCurrentPosition.mockImplementationOnce((_, error) => {
      error({
        code: 1,
        message: 'User denied Geolocation',
      });
    });

    const { result } = renderHook(() => useGeolocation({ fallback: 'Default District' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.locationName).toBe('Default District');
    expect(result.current.error).toBe('User denied Geolocation');
    expect(result.current.geoAnchor).toBeNull();
  });
});
