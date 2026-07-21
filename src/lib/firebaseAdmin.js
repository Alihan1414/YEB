import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminDb;

function getAdminDb() {
  if (adminDb) return adminDb;

  if (!getApps().find(a => a.name === 'admin')) {
    initializeApp(
      {
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      },
      'admin'
    );
  }

  adminDb = getFirestore('admin');
  return adminDb;
}

export { getAdminDb };
