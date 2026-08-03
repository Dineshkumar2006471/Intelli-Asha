const { GoogleGenAI, Type } = require('@google/genai');

async function run() {
  try {
    const ai = new GoogleGenAI({ vertexai: true, project: 'kavach-hackathon-500511', location: 'asia-south1' });
    
    const dashboardSchema = {
      type: Type.OBJECT,
      properties: {
        aiBrief: {
          type: Type.OBJECT,
          properties: {
            anomaly: { type: Type.STRING },
            recommendation: { type: Type.STRING },
            alert: { type: Type.STRING },
          },
          required: ['anomaly', 'recommendation', 'alert'],
        },
        metrics: {
          type: Type.OBJECT,
          properties: {
            total_ashas: { type: Type.NUMBER },
            total_beneficiaries: { type: Type.NUMBER },
            surveys_completed: { type: Type.NUMBER },
            high_risk_cases: { type: Type.NUMBER },
            data_quality_score: { type: Type.NUMBER },
            disbursement_ready: { type: Type.NUMBER },
          },
          required: [
            'total_ashas', 'total_beneficiaries', 'surveys_completed',
            'high_risk_cases', 'data_quality_score', 'disbursement_ready',
          ],
        },
        phcs: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              block: { type: Type.STRING },
              active_ashas: { type: Type.NUMBER },
              surveys_wtd: { type: Type.NUMBER },
              status: { type: Type.STRING, enum: ['Optimal', 'Delayed', 'Critical'] },
              readiness: { type: Type.STRING },
            },
            required: ['name', 'block', 'active_ashas', 'surveys_wtd', 'status', 'readiness'],
          },
        },
      },
      required: ['aiBrief', 'metrics', 'phcs'],
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [{ text: "Hello, generate dashboard" }]
      }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: dashboardSchema,
      }
    });
    console.log("Success!", response.text);
  } catch (err) {
    console.error("FAIL:", err);
  }
}
run();
