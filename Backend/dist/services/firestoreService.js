"use strict";
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
const firebaseAdmin_1 = require("../config/firebaseAdmin");
async function getUserProfile(userId) {
    const snap = await (0, firebaseAdmin_1.getDb)().collection('users').doc(userId).get();
    if (!snap.exists)
        return null;
    const data = { ...(snap.data() || {}) };
    delete data.passwordHash;
    delete data.password;
    return { userId: snap.id, ...data };
}
async function getUserAuthRecord(userId) {
    const snap = await (0, firebaseAdmin_1.getDb)().collection('users').doc(userId).get();
    if (!snap.exists)
        return null;
    return { userId: snap.id, ...(snap.data() || {}) };
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
