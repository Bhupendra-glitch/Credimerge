"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timestamp = void 0;
exports.getFirebaseApp = getFirebaseApp;
exports.getDb = getDb;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let app = null;
function getFirebaseApp() {
    if (app)
        return app;
    if (firebase_admin_1.default.apps.length > 0) {
        app = firebase_admin_1.default.app();
        return app;
    }
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const defaultServiceAccountPath = path_1.default.resolve(process.cwd(), 'credentials', 'firebase-service-account.json');
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
        || (fs_1.default.existsSync(defaultServiceAccountPath) ? defaultServiceAccountPath : undefined);
    const hasInlineServiceAccount = Boolean(clientEmail && privateKey);
    let credential;
    if (serviceAccountPath) {
        const resolvedPath = path_1.default.resolve(process.cwd(), serviceAccountPath);
        if (!fs_1.default.existsSync(resolvedPath)) {
            throw new Error(`Firebase service-account file was not found at ${resolvedPath}.`);
        }
        let serviceAccount;
        try {
            serviceAccount = JSON.parse(fs_1.default.readFileSync(resolvedPath, 'utf8'));
        }
        catch {
            throw new Error('Firebase service-account file is not valid JSON.');
        }
        if (serviceAccount.type !== 'service_account'
            || typeof serviceAccount.project_id !== 'string'
            || typeof serviceAccount.client_email !== 'string'
            || typeof serviceAccount.private_key !== 'string') {
            throw new Error('Firebase service-account file is missing required service-account fields.');
        }
        credential = firebase_admin_1.default.credential.cert({
            projectId: serviceAccount.project_id,
            clientEmail: serviceAccount.client_email,
            privateKey: serviceAccount.private_key,
        });
    }
    else if (hasInlineServiceAccount) {
        if (!projectId || !clientEmail || !privateKey) {
            throw new Error('FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must all be configured');
        }
        credential = firebase_admin_1.default.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
        });
    }
    else {
        const googleCloudProject = process.env.GOOGLE_CLOUD_PROJECT;
        if (googleCloudProject && /^(your_|replace)/i.test(googleCloudProject)) {
            throw new Error('Firebase Admin is not configured. Place a service-account key at Backend/credentials/firebase-service-account.json or configure Application Default Credentials.');
        }
        credential = firebase_admin_1.default.credential.applicationDefault();
    }
    app = firebase_admin_1.default.initializeApp({
        credential,
        storageBucket: process.env.GCS_BUCKET || undefined,
    });
    return app;
}
function getDb() {
    return getFirebaseApp().firestore();
}
exports.Timestamp = firebase_admin_1.default.firestore.Timestamp;
