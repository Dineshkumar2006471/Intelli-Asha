const { execSync } = require('child_process');

async function test() {
  try {
    const token = execSync('gcloud auth print-access-token').toString().trim();
    const url = 'https://us-central1-aiplatform.googleapis.com/v1/projects/kavach-hackathon-500511/locations/us-central1/publishers/google/models/gemini-1.5-flash:generateContent';
    
    console.log("Fetching Vertex AI...");
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
      })
    });
    
    const data = await res.json();
    if (res.ok) {
      console.log("✅ Vertex AI Success!");
      console.log("BILLING IS ENABLED AND ACTIVE.");
    } else {
      console.log("❌ Vertex AI Failed!");
      console.log(data);
    }
  } catch(e) {
    console.error(e);
  }
}
test();
