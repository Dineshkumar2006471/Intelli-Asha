import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '../utils/logger';
import type { GeoAnchor } from '../types';

const log = createLogger('GEOLOCATION');

interface GeolocationState {
  locationName: string;
  districtName: string;
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
  const [districtName, setDistrictName] = useState<string>('Unknown District');
  const [geoAnchor, setGeoAnchor] = useState<GeoAnchor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<string> => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          throw new Error('Google Maps API Key is missing from environment');
        }

        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || data.status !== 'OK' || !data.results || data.results.length === 0) {
          throw new Error('No results from Google Maps Geocoding');
        }

        const results = data.results;
        
        // Unified District Extraction
        let district = 'Unknown District';
        for (const result of results) {
          for (const component of result.address_components) {
            if (component.types.includes('administrative_area_level_2')) {
              district = component.long_name;
              break;
            }
          }
          if (district !== 'Unknown District') break;
        }

        // If still unknown, try locality
        if (district === 'Unknown District') {
          for (const result of results) {
            for (const component of result.address_components) {
              if (component.types.includes('locality')) {
                district = component.long_name;
                break;
              }
            }
            if (district !== 'Unknown District') break;
          }
        }

        if (district !== 'Unknown District') {
          // Clean up "District" suffix to prevent "YSR District District"
          district = district.replace(/ district/i, '').replace(/ dist/i, '').trim();
          district = `${district} District`;
        } else {
          district = fallback;
        }

        setDistrictName(district);
        
        // Find appropriate component based on zoom level
        if (zoom >= 14) {
          // Field worker level
          let block = 'Unknown Block';
          
          for (const result of results) {
            for (const component of result.address_components) {
              if (component.types.includes('sublocality') || component.types.includes('locality')) {
                block = component.long_name;
                break;
              }
            }
            if (block !== 'Unknown Block') break;
          }
          return `${block} PHC, ${district}`;
        }

        // Dashboard level
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
      async (_position) => {
        const latitude = _position.coords.latitude;
        const longitude = _position.coords.longitude;
        const accuracy = _position.coords.accuracy;

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

  return { locationName, districtName, geoAnchor, loading, error };
}
