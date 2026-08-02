import * as admin from 'firebase-admin';

// Initialize Firebase Admin with ADC (Application Default Credentials)
admin.initializeApp({
  projectId: 'kavach-hackathon-500511',
});

const db = admin.firestore();

async function seed() {
  console.log('🌱 Seeding IntelliASHA Demo Data...');

  const batch = db.batch();

  // 1. Seed Workers
  const workerRef = db.collection('workers').doc('+919999999999');
  batch.set(workerRef, {
    name: 'Sunita Devi (Demo)',
    phone: '+919999999999',
    location: 'Rampur PHC',
    lastActive: new Date().toISOString(),
  });

  // 2. Seed Verified Visits (To populate Heatmap and Earnings)
  console.log('Injecting 20 Verified Visits...');
  const baseLat = 28.8152;
  const baseLng = 79.0255;
  
  for (let i = 0; i < 20; i++) {
    const visitRef = db.collection('visits').doc();
    batch.set(visitRef, {
      workerId: '+919999999999',
      householdName: `Family ${i + 1}`,
      childName: `Child ${i + 1}`,
      childAge: '2',
      weight: '12kg',
      status: i % 5 === 0 ? 'Underweight' : 'Normal',
      visitType: i % 2 === 0 ? 'Immunization' : 'General Visit',
      immunisation: 'Polio',
      rawTranscription: 'Sample voice log transcribed.',
      geoAnchor: {
        lat: baseLat + (Math.random() - 0.5) * 0.05,
        lng: baseLng + (Math.random() - 0.5) * 0.05,
        accuracy: 10 + Math.random() * 5,
      },
      timestamp: admin.firestore.Timestamp.now(),
      anomaliesFound: false,
      verificationConfidence: 96 + Math.random() * 3,
      verifiedAt: admin.firestore.Timestamp.now(),
    });
  }

  // 3. Seed Anomalous Visits (To trigger Incentive Agent AI Deductions)
  console.log('Injecting 3 Anomalous Visits...');
  for (let i = 0; i < 3; i++) {
    const visitRef = db.collection('visits').doc();
    batch.set(visitRef, {
      workerId: '+919999999999',
      householdName: `Ghost Family ${i}`,
      childName: `Ghost Child ${i}`,
      childAge: '1',
      weight: '10kg',
      status: 'Normal',
      visitType: 'Institutional Delivery',
      immunisation: 'None',
      rawTranscription: 'Suspiciously identical voice log.',
      geoAnchor: {
        lat: baseLat + 1.5, // Way outside normal bounds
        lng: baseLng + 1.5,
        accuracy: 50,
      },
      timestamp: admin.firestore.Timestamp.now(),
      anomaliesFound: true,
      flaggedReason: 'Geo-location mismatch. Distance from PHC exceeds 150km.',
      verificationConfidence: 34.5,
      verifiedAt: admin.firestore.Timestamp.now(),
    });
  }

  // 4. Seed an Alert (Simulating Alert Agent output for Zero-Visit Zone)
  console.log('Injecting Alert for Zero-Visit Zone...');
  const alertRef = db.collection('alerts').doc();
  batch.set(alertRef, {
    title: 'Zero Coverage Zone Detected',
    severity: 'high',
    message: 'Zone 3C (Rampur North) has recorded 0 visits this week despite high Dengue risk.',
    visitId: 'N/A',
    workerId: 'ALL',
    householdName: 'N/A',
    timestamp: admin.firestore.Timestamp.now(),
    status: 'unread',
  });

  await batch.commit();
  console.log('✅ Seeding Complete! The system is ready for the demo.');
}

seed().catch(console.error);
