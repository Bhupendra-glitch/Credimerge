import admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function getFirebaseApp(): admin.app.App {
  if (app) return app;
  if (admin.apps.length > 0) {
    app = admin.app();
    return app;
  }

  app = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: process.env.GCS_BUCKET || undefined,
  });

  return app;
}

export function getDb(): admin.firestore.Firestore {
  return getFirebaseApp().firestore();
}

export const Timestamp = admin.firestore.Timestamp;
