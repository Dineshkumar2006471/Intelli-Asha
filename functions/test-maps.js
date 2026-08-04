const https = require('https');

// Read the Google Maps API Key from the frontend environment
const fs = require('fs');
const env = fs.readFileSync('../.env.local', 'utf8');
const match = env.match(/VITE_GOOGLE_MAPS_API_KEY=(.*)/);
const apiKey = match ? match[1].trim() : null;

if (!apiKey) {
  console.log("No API key found in .env.local");
  process.exit(1);
}

const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=17.4065,78.4772&key=${apiKey}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    if (json.error_message) {
      console.log("❌ Google Maps Failed!");
      console.log(json.error_message);
      if (json.error_message.includes('billing')) {
        console.log("BILLING IS DISABLED");
      }
    } else if (json.status === 'OK') {
      console.log("✅ Google Maps Success!");
      console.log("BILLING IS ENABLED AND ACTIVE.");
    } else {
      console.log("Status:", json.status);
    }
  });
}).on('error', (e) => {
  console.error(e);
});
