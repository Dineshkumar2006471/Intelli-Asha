const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'kavach-hackathon-500511' });
const db = admin.firestore();

async function checkDb() {
    try {
        const collections = await db.listCollections();
        console.log("=== FIRESTORE COLLECTIONS ===");
        if (collections.length === 0) {
             console.log("No collections found in production.");
        }
        for (let collection of collections) {
            console.log(`Collection: ${collection.id}`);
            const snapshot = await collection.limit(1).get();
            snapshot.forEach(doc => {
                console.log(`  Sample Document [${doc.id}]:`, JSON.stringify(doc.data()));
            });
        }
    } catch(err) {
        console.log("=== FIRESTORE ERROR ===");
        console.error(err.message);
    }
}
checkDb();
