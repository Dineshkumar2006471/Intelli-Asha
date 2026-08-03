const { GoogleGenAI } = require('@google/genai');

async function testVertex() {
  try {
    const ai = new GoogleGenAI({ vertexai: true, project: 'kavach-hackathon-500511', location: 'us-central1' });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Respond with a single word: SUCCESS',
    });
    console.log("VERTEX AI CALL SUCCEEDED:", response.text);
  } catch(err) {
    console.error("VERTEX AI CALL FAILED:");
    console.error(err.message);
  }
}
testVertex();
