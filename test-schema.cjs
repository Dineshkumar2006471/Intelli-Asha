const { GoogleGenAI, Type } = require('@google/genai');

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

const ai = new GoogleGenAI({ project: 'kavach-hackathon-500511', location: 'us-central1' });

async function test() {
  const text = 'Visited house number 10. The child is Aryan, age 4, weight 14kg, everything is normal. By the way, the village water pump is completely broken and the family requested mosquito nets.';
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text }] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: visitDataSchema,
      temperature: 0.1,
    }
  });
  
  console.log(response.text);
}

test().catch(console.error);
