import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '../utils/logger';
import type { GeoAnchor } from '../types';

const log = createLogger('GEOLOCATION');

interface GeolocationState {
  /** Resolved location name (e.g., "Block Name PHC, District") */
  locationName: string;
  /** Raw GPS coordinates, null if unavailable */
  geoAnchor: GeoAnchor | null;
  /** Whether geolocation is still being resolved */
  loading: boolean;
  /** Error message if geolocation failed */
  error: string | null;
}

interface UseGeolocationOptions {
  /** Nominatim zoom level: 10 = city/district, 14 = suburb/village */
  zoom?: number;
  /** Fallback name when geolocation is denied or unavailable */
  fallback?: string;
}

/**
 * Custom hook that consolidates all geolocation + reverse-geocoding logic.
 * Replaces duplicated Nominatim code across FieldWorker, DHODashboard, and SupervisorReports.
 *
 * @example
 * ```tsx
 * const { locationName, geoAnchor, loading } = useGeolocation({ zoom: 14, fallback: 'Unknown Block' });
 * ```
 */
export function useGeolocation(options: UseGeolocationOptions = {}): GeolocationState {
  const { zoom = 10, fallback = 'Your District' } = options;

  const [locationName, setLocationName] = useState<string>('Detecting location...');
  const [geoAnchor, setGeoAnchor] = useState<GeoAnchor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<string> => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=${zoom}`,
          {
            headers: {
              'User-Agent': 'IntelliASHA-Agent/1.0 (Contact: contact@intelliasha.gov)',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Nominatim returned ${response.status}`);
        }

        const data = await response.json();

        if (zoom >= 14) {
          // Village/suburb level — for field workers
          const block =
            data.address?.suburb ??
            data.address?.village ??
            data.address?.town ??
            data.address?.city ??
            'Unknown Block';
          const district =
            data.address?.state_district ??
            data.address?.county ??
            'Unknown District';
          return `${block} PHC, ${district}`;
        }

        // City/district level — for dashboards
        return (
          data.address?.city ??
          data.address?.town ??
          data.address?.county ??
          data.address?.state_district ??
          fallback
        );
      } catch (err) {
        log.warn('Reverse geocoding failed', err);
        return 'GPS Acquired, Location Unknown';
      }
    },
    [zoom, fallback]
  );

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationName(fallback);
      setError('Geolocation not supported');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGeoAnchor({ lat: latitude, lng: longitude, accuracy });

        const name = await reverseGeocode(latitude, longitude);
        setLocationName(name);
        setLoading(false);

        log.info('Geolocation resolved', { name, accuracy });
      },
      (geoErr) => {
        log.warn('Geolocation denied', { code: geoErr.code, message: geoErr.message });
        setLocationName(fallback);
        setError(geoErr.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [reverseGeocode, fallback]);

  return { locationName, geoAnchor, loading, error };
}
