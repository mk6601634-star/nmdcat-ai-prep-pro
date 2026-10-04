const fs = require('fs');
const path = require('path');

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log('Testing Firestore REST API for project:', firebaseConfig.projectId);

async function testRest() {
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/mcqs?key=${firebaseConfig.apiKey}&pageSize=300`;
  console.log('Requesting:', url);
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.documents) {
      console.log(`SUCCESS! Found ${data.documents.length} documents via REST API.`);
      if (data.nextPageToken) {
        console.log('Next page token exists.');
      }
    } else {
      console.log('REST response:', JSON.stringify(data).slice(0, 300));
    }
  } catch (err) {
    console.error('REST error:', err);
  }
}

testRest();
