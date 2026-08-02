import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '../utils/logger';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';
import type { GeoAnchor } from '../types';

const log = createLogger('GEOLOCATION');
const functions = getFunctions(app, 'asia-south1');

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
        const geocode = httpsCallable<{ lat: number; lng: number }, { success: boolean; data: any[] }>(functions, 'geocode');
        const response = await geocode({ lat, lng });

        if (!response.data.success || !response.data.data || response.data.data.length === 0) {
          throw new Error('No results from Google Maps Geocoding');
        }

        const results = response.data.data;
        
        // Find appropriate component based on zoom level
        if (zoom >= 14) {
          // Field worker level
          let block = 'Unknown Block';
          let district = 'Unknown District';
          
          for (const result of results) {
            for (const component of result.address_components) {
              if (component.types.includes('sublocality') || component.types.includes('locality')) {
                block = component.long_name;
              }
              if (component.types.includes('administrative_area_level_3') || component.types.includes('administrative_area_level_2')) {
                district = component.long_name;
              }
            }
            if (block !== 'Unknown Block' && district !== 'Unknown District') break;
          }
          return `${block} PHC, ${district}`;
        }

        // Dashboard level
        let city = fallback;
        for (const result of results) {
          for (const component of result.address_components) {
            if (component.types.includes('administrative_area_level_2') || component.types.includes('locality')) {
              city = component.long_name;
              break;
            }
          }
          if (city !== fallback) break;
        }
        
        return city;
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
