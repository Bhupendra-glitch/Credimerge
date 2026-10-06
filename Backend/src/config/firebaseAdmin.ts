import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

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
  const defaultServiceAccountPath = path.resolve(
    process.cwd(),
    'credentials',
    'firebase-service-account.json',
  );
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    || (fs.existsSync(defaultServiceAccountPath) ? defaultServiceAccountPath : undefined);
  const serviceAccountValues = [projectId, clientEmail, privateKey];
  const hasServiceAccountConfig = serviceAccountValues.some(Boolean);
  let credential: admin.credential.Credential;

  if (serviceAccountPath && hasServiceAccountConfig) {
    throw new Error(
      'Configure either GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY, not both.',
    );
  }

  if (serviceAccountPath) {
    const resolvedPath = path.resolve(process.cwd(), serviceAccountPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Firebase service-account file was not found at ${resolvedPath}.`);
    }

    let serviceAccount: Record<string, unknown>;
    try {
      serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    } catch {
      throw new Error('Firebase service-account file is not valid JSON.');
    }

    if (
      serviceAccount.type !== 'service_account'
      || typeof serviceAccount.project_id !== 'string'
      || typeof serviceAccount.client_email !== 'string'
      || typeof serviceAccount.private_key !== 'string'
    ) {
      throw new Error('Firebase service-account file is missing required service-account fields.');
    }

    credential = admin.credential.cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    });
  } else if (hasServiceAccountConfig) {
    if (serviceAccountValues.some((value) => !value)) {
      throw new Error('FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must all be configured');
    }
    credential = admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey!.replace(/\\n/g, '\n'),
    });
  } else {
    const googleCloudProject = process.env.GOOGLE_CLOUD_PROJECT;
    if (googleCloudProject && /^(your_|replace)/i.test(googleCloudProject)) {
      throw new Error(
        'Firebase Admin is not configured. Place a service-account key at Backend/credentials/firebase-service-account.json or configure Application Default Credentials.',
      );
    }
    credential = admin.credential.applicationDefault();
  }

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
