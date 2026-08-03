import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGeolocation } from '../useGeolocation';


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
    // Set dummy env var for test
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'dummy-key');
    
    mockGetCurrentPosition.mockImplementationOnce((success) => {
      success({
        coords: {
          latitude: 28.6139,
          longitude: 77.209,
          accuracy: 15,
        },
      });
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [{
          address_components: [
            { types: ['administrative_area_level_2'], long_name: 'Delhi Division' }
          ]
        }]
      })
    });

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
