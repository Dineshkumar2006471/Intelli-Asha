const { GoogleGenAI } = require('@google/genai');

async function testBilling() {
  try {
    console.log("Checking Vertex AI (Google Cloud Billing)...");
    const ai = new GoogleGenAI({ vertexai: { project: 'kavach-hackathon-500511', location: 'us-central1' } });
    
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'Hello, are you working?',
    });
    console.log("✅ Vertex AI Success!");
    console.log("Response:", response.text);
    console.log("\nBILLING IS ENABLED AND ACTIVE.");
  } catch (error) {
    console.error("❌ Vertex AI Failed!");
    console.error(error.message || error);
    if (error.status === 403 || (error.message && error.message.includes('billing'))) {
      console.error("\nBILLING IS STILL DISABLED OR BLOCKED.");
    }
  }
}

testBilling();
