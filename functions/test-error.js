const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: 'fake', project: '' });

async function test() {
  try {
    await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'hello'
    });
  } catch (error) {
    console.log("Raw error typeof:", typeof error);
    console.log("error.status:", error.status);
    console.log("error.response?.status:", error.response?.status);
    console.log("error.error?.code:", error.error?.code);
    
    let errorMsg = '';
    if (error.message) {
      if (typeof error.message === 'string') {
        errorMsg = error.message.toLowerCase();
      } else {
        errorMsg = JSON.stringify(error.message).toLowerCase();
      }
    } else {
      errorMsg = String(error).toLowerCase();
    }
    
    console.log("errorMsg parsed:", errorMsg);
    console.log("isRateLimit?", errorMsg.includes('429') || errorMsg.includes('quota'));
  }
}

test();
