import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '../utils/logger';
import type { GeoAnchor } from '../types';

const log = createLogger('GEOLOCATION');

interface GeolocationState {
  locationName: string;
  geoAnchor: GeoAnchor | null;
  loading: boolean;
  error: string | null;
}

interface UseGeolocationOptions {
  zoom?: number;
  fallback?: string;
}

export function useGeolocation(options: UseGeolocationOptions = {}): GeolocationState {
  const { zoom = 10, fallback = 'Your District' } = options;

  const [locationName, setLocationName] = useState<string>('Detecting location...');
  const [geoAnchor, setGeoAnchor] = useState<GeoAnchor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<string> => {
      try {
        // Using Nominatim (OpenStreetMap) to bypass Google API key referrer restrictions on client-side fetch
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
        const response = await fetch(url, { headers: { 'User-Agent': 'IntelliASHA-App' } });
        const data = await response.json();

        if (!response.ok || !data || !data.address) {
          throw new Error('No results from Geocoder');
        }

        const address = data.address;
        
        if (zoom >= 14) {
          // Field worker level
          const block = address.suburb || address.village || address.town || address.city_district || 'Local';
          const dist = address.state_district || address.county || address.city || fallback;
          return `${block} PHC, ${dist}`;
        }

        // Dashboard level - Find the District
        let district = address.state_district || address.county || address.region || address.city;
        
        if (!district) return fallback;
        
        // Make sure "District" is appended nicely
        if (!district.toLowerCase().includes('district') && !district.toLowerCase().includes('dist')) {
          district = `${district} District`;
        }
        
        return district;
      } catch (err: any) {
        log.warn('Reverse geocoding failed', err);
        return fallback;
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
