"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timestamp = void 0;
exports.getFirebaseApp = getFirebaseApp;
exports.getDb = getDb;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
let app = null;
function getFirebaseApp() {
    if (app)
        return app;
    if (firebase_admin_1.default.apps.length > 0) {
        app = firebase_admin_1.default.app();
        return app;
    }
    app = firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.applicationDefault(),
        storageBucket: process.env.GCS_BUCKET || undefined,
    });
    return app;
}
function getDb() {
    return getFirebaseApp().firestore();
}
exports.Timestamp = firebase_admin_1.default.firestore.Timestamp;
