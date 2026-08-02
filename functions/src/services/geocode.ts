/**
 * IntelliASHA — Geocoding Service (Cloud Function)
 *
 * Provides secure server-side access to Google Maps Geocoding API
 * so the server key is never exposed to the client.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';

const mapsApiKey = defineSecret('GOOGLE_MAPS_API_KEY');

export const geocode = onCall(
  {
    secrets: [mapsApiKey],
    region: 'asia-south1',
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const { lat, lng, address } = request.data as { lat?: number; lng?: number; address?: string };

    try {
      let url = '';
      if (lat !== undefined && lng !== undefined) {
        url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${mapsApiKey.value()}`;
      } else if (address) {
        url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${mapsApiKey.value()}`;
      } else {
        throw new HttpsError('invalid-argument', 'Must provide lat/lng or address');
      }

      const response = await fetch(url);
      const data = await response.json() as { status: string; results: Record<string, unknown>[]; error_message?: string };

      if (!response.ok || data.status !== 'OK') {
        logger.warn('[GEOCODE] Google Maps API returned error', { status: data.status, error: data.error_message });
        throw new Error(data.error_message || data.status);
      }

      return { success: true, data: data.results };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('[GEOCODE] Failed', { error: message });
      throw new HttpsError('internal', `Geocoding failed: ${message}`);
    }
  }
);
