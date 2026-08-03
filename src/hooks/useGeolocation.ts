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
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey || apiKey.includes('VITE_')) {
          throw new Error('Missing Google Maps API Key in .env');
        }
        
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || data.status !== 'OK' || !data.results || data.results.length === 0) {
          throw new Error(data.error_message || 'No results from Google Maps');
        }

        const results = data.results;
        
        // Find appropriate component based on zoom level
        if (zoom >= 14) {
          // Field worker level
          let block = '';
          let district = '';
          
          for (const result of results) {
            for (const component of result.address_components) {
              if (component.types.includes('sublocality') || component.types.includes('locality')) {
                if (!block) block = component.long_name;
              }
              if (component.types.includes('administrative_area_level_3') || component.types.includes('administrative_area_level_2')) {
                if (!district) district = component.long_name;
              }
            }
          }
          
          block = block || 'Local';
          district = district || fallback;
          return `${block} PHC, ${district}`;
        }

        // Dashboard level - Find the District (Admin Level 2 in India)
        let district = '';
        for (const result of results) {
          for (const component of result.address_components) {
            if (component.types.includes('administrative_area_level_2')) {
              district = component.long_name;
              break;
            }
          }
          if (district) break;
        }
        
        // Fallback to locality if admin_level_2 isn't found
        if (!district) {
          for (const result of results) {
            for (const component of result.address_components) {
              if (component.types.includes('locality')) {
                district = component.long_name;
                break;
              }
            }
            if (district) break;
          }
        }
        
        if (!district) return fallback;
        
        // Make sure "District" is appended nicely for the dashboard if missing
        if (!district.toLowerCase().includes('district') && !district.toLowerCase().includes('dist')) {
          district = `${district} District`;
        }
        
        return district;
      } catch (err: any) {
        log.warn('Reverse geocoding failed', err);
        return err.message?.includes('API Key') ? '⚠️ Maps API Key Missing' : fallback;
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
