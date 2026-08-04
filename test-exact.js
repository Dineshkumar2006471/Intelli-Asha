import { GoogleGenAI, Type } from '@google/genai';

const visitDataSchema = {
  type: Type.OBJECT,
  properties: {
    householdName: { type: Type.STRING },
    childName: { type: Type.STRING },
    childAge: { type: Type.STRING },
    weight: { type: Type.STRING },
    status: {
      type: Type.STRING,
      enum: ['Normal', 'Underweight', 'Severe Acute Malnutrition', 'Unknown'],
    },
    visitType: {
      type: Type.STRING,
      enum: ['Immunization', 'Antenatal Care', 'Institutional Delivery', 'HBNC', 'General Visit'],
    },
    immunisation: { type: Type.STRING },
    followUpNeeded: { type: Type.BOOLEAN },
    followUpReason: { type: Type.STRING },
    detectedLanguage: {
      type: Type.STRING,
      enum: ['hindi', 'english', 'telugu', 'tamil', 'bengali', 'kannada', 'other'],
    },
    observations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    'householdName', 'childName', 'childAge', 'weight',
    'status', 'visitType', 'immunisation', 'followUpNeeded',
    'detectedLanguage', 'observations'
  ],
};

const SYSTEM_INSTRUCTION = `You are the IntelliASHA Field Agent — an AI assistant embedded in India's public health system.

Your job: Extract structured health-visit data from an ASHA worker's voice transcription.

RULES:
1. The input may be in Hindi, Telugu, Tamil, Bengali, Kannada, or English — handle all.
2. Extract every field in the output schema. If a value is not mentioned, use "Not mentioned" for strings, "Unknown" for status, and false for booleans.
3. For weight: extract numeric value with unit (e.g. "4.2 kg"). If only a number is said, assume kilograms.
4. For childAge: normalise to a readable format (e.g. "3 months", "2 years").
5. Classify visitType based on activities described:
   - "Immunization" if vaccines are mentioned
   - "Antenatal Care" if pregnancy checkup described
   - "Institutional Delivery" if delivery/birth facilitation described
   - "HBNC" if newborn care / infant described
   - "General Visit" for all other health visits
6. Set followUpNeeded=true if danger signs are mentioned.
7. NEVER fabricate data that isn't in the transcription.
8. Respond ONLY with valid JSON matching the output schema.
9. CRITICAL: ALL extracted string values MUST be translated to English.
10. Extract any extra context into the \`observations\` array as short bullet points.`;

const ai = new GoogleGenAI({ project: 'kavach-hackathon-500511', location: 'us-central1' });

async function test() {
  const text = 'aap visited house number 10 D 6 inch RN ag4 vate 14 kg everything is normal r d best water pump is completely and D fan D request';
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text }] }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: visitDataSchema,
      temperature: 0.1,
    }
  });
  
  console.log(response.text);
}

test().catch(console.error);
