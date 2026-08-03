import { describe, it, expect, beforeAll } from 'vitest';
import { signInAnonymously } from 'firebase/auth';
import { auth, functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { saveVisit } from '../services/db';

const isCI = import.meta.env.VITE_FIREBASE_API_KEY === 'ci-dummy-key';

describe.skipIf(isCI)('End-to-End System Integration', () => {
  beforeAll(async () => {
    // 1. Authenticate as a test user
    try {
      await signInAnonymously(auth);
      console.log('Test user authenticated successfully.');
    } catch (e) {
      console.error('Failed to authenticate test user:', e);
      throw e;
    }
  });

  it('should process a voice note via Gemini and save to Firestore', async () => {
    const rawTranscript = 'Visited Sharma household. Child Rahul, weight 12kg. Standard checkup. Everything looks fine.';
    
    // 2. Call the AI Agent Cloud Function
    const processVisitVoiceNote = httpsCallable(functions, 'processVisitVoiceNote');
    console.log('Calling AI Agent Cloud Function...');
    const result = await processVisitVoiceNote({ text: rawTranscript });
    
    const payload = result.data as any;
    console.log('AI Agent Response:', payload);
    const data = payload.data;
    
    expect(data).toBeDefined();
    expect(data.householdName).toBe('Sharma');
    expect(data.childName).toBe('Rahul');
    expect(data.weight?.replace(' ', '')).toBe('12kg');
    expect(data.status).toBeDefined();

    // 3. Save to Firestore
    console.log('Saving structured data to Firestore...');
    const visitId = await saveVisit({
      ...data,
      rawTranscription: rawTranscript,
      geoAnchor: null,
      audioUrl: null
    }, auth.currentUser!.uid);
    
    console.log('Visit saved successfully with ID:', visitId);
    expect(visitId).toBeTruthy();
  }, 30000); // 30 second timeout for external API calls
});
