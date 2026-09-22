"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfile = getUserProfile;
exports.getUserAuthRecord = getUserAuthRecord;
exports.listLoans = listLoans;
exports.getLoan = getLoan;
exports.createLoan = createLoan;
exports.updateLoan = updateLoan;
exports.deleteLoan = deleteLoan;
exports.saveCreditReport = saveCreditReport;
exports.getLatestCreditReport = getLatestCreditReport;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const firebaseAdmin_1 = require("../config/firebaseAdmin");
function getDemoUser(userId) {
    if (process.env.NODE_ENV === 'production')
        return null;
    const csvPath = [
        path_1.default.resolve(process.cwd(), 'src', 'data', 'users.csv'),
        path_1.default.resolve(__dirname, '..', 'data', 'users.csv'),
    ].find((candidate) => fs_1.default.existsSync(candidate));
    if (!csvPath)
        return null;
    const [headerLine, ...dataLines] = fs_1.default.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
    const headers = headerLine.split(',').map((header) => header.trim());
    const row = dataLines.find((line) => line.split(',')[0]?.trim().toUpperCase() === userId.toUpperCase());
    if (!row)
        return null;
    const values = row.split(',');
    return headers.reduce((user, header, index) => {
        const value = values[index]?.trim() ?? '';
        user[header] = value !== '' && !Number.isNaN(Number(value)) ? Number(value) : value;
        return user;
    }, {});
}
async function getUserProfile(userId) {
    try {
        const snap = await (0, firebaseAdmin_1.getDb)().collection('users').doc(userId).get();
        if (snap.exists) {
            const data = { ...(snap.data() || {}) };
            delete data.passwordHash;
            delete data.password;
            return { userId: snap.id, ...data };
        }
    }
    catch (error) {
        console.warn('Firestore unavailable; using development demo data:', error instanceof Error ? error.message : error);
    }
    const data = getDemoUser(userId);
    if (!data)
        return null;
    delete data.passwordHash;
    delete data.password;
    return { userId: userId.toUpperCase(), ...data };
}
async function getUserAuthRecord(userId) {
    try {
        const snap = await (0, firebaseAdmin_1.getDb)().collection('users').doc(userId).get();
        if (snap.exists)
            return { userId: snap.id, ...(snap.data() || {}) };
    }
    catch (error) {
        console.warn('Firestore unavailable; using development demo data:', error instanceof Error ? error.message : error);
    }
    const data = getDemoUser(userId);
    return data ? { userId: userId.toUpperCase(), ...data } : null;
}
async function listLoans(userId) {
    const snap = await (0, firebaseAdmin_1.getDb)().collection('users').doc(userId).collection('loans').orderBy('createdAt', 'desc').get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
async function getLoan(userId, loanId) {
    const snap = await (0, firebaseAdmin_1.getDb)().collection('users').doc(userId).collection('loans').doc(loanId).get();
    if (!snap.exists)
        return null;
    return { id: snap.id, ...snap.data() };
}
async function createLoan(userId, data) {
    const ref = (0, firebaseAdmin_1.getDb)().collection('users').doc(userId).collection('loans').doc();
    const now = firebaseAdmin_1.Timestamp.now();
    const payload = { ...data, createdAt: now, updatedAt: now };
    await ref.set(payload);
    return { id: ref.id, ...payload };
}
async function updateLoan(userId, loanId, data) {
    const ref = (0, firebaseAdmin_1.getDb)().collection('users').doc(userId).collection('loans').doc(loanId);
    const snap = await ref.get();
    if (!snap.exists)
        return null;
    const payload = { ...data, updatedAt: firebaseAdmin_1.Timestamp.now() };
    await ref.update(payload);
    return { id: loanId, ...(snap.data() || {}), ...payload };
}
async function deleteLoan(userId, loanId) {
    const ref = (0, firebaseAdmin_1.getDb)().collection('users').doc(userId).collection('loans').doc(loanId);
    const snap = await ref.get();
    if (!snap.exists)
        return false;
    await ref.delete();
    return true;
}
async function saveCreditReport(userId, report) {
    const ref = (0, firebaseAdmin_1.getDb)().collection('users').doc(userId).collection('creditReports').doc();
    const payload = { ...report, createdAt: firebaseAdmin_1.Timestamp.now() };
    await ref.set(payload);
    return { id: ref.id, ...payload };
}
async function getLatestCreditReport(userId) {
    const snap = await (0, firebaseAdmin_1.getDb)().collection('users').doc(userId).collection('creditReports').orderBy('createdAt', 'desc').limit(1).get();
    if (snap.empty)
        return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
}
