import admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function getFirebaseApp(): admin.app.App {
  if (app) return app;
  if (admin.apps.length > 0) {
    app = admin.app();
    return app;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const serviceAccountValues = [projectId, clientEmail, privateKey];
  const hasServiceAccountConfig = serviceAccountValues.some(Boolean);

  if (hasServiceAccountConfig && serviceAccountValues.some((value) => !value)) {
    throw new Error('FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must all be configured');
  }

  const credential = hasServiceAccountConfig
    ? admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey!.replace(/\\n/g, '\n'),
      })
    : admin.credential.applicationDefault();

  app = admin.initializeApp({
    credential,
    storageBucket: process.env.GCS_BUCKET || undefined,
  });

  return app;
}

export function getDb(): admin.firestore.Firestore {
  return getFirebaseApp().firestore();
}

export const Timestamp = admin.firestore.Timestamp;
