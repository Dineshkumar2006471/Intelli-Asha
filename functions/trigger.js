const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function run() {
  const visitRef = db.collection('visits').doc();
  await visitRef.set({
    workerId: 'admin-trigger',
    householdName: 'Admin Ping',
    districtName: 'Modamidipalle District',
    locationName: 'Modamidipalle District',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    visitType: 'System Ping',
    anomaliesFound: false
  });
  console.log('Triggered analytics for Modamidipalle District. Visit ID: ' + visitRef.id);
  process.exit(0);
}
run().catch(console.error);
