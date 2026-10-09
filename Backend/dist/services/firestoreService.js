"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrUpdateUser = createOrUpdateUser;
exports.storeEmailVerificationCode = storeEmailVerificationCode;
exports.verifyEmailCodeRecord = verifyEmailCodeRecord;
exports.getUserProfile = getUserProfile;
exports.getUserAuthRecord = getUserAuthRecord;
exports.updateUserProfile = updateUserProfile;
exports.updateUserPhoto = updateUserPhoto;
exports.updateUserPassword = updateUserPassword;
exports.createPasswordResetToken = createPasswordResetToken;
exports.consumePasswordResetToken = consumePasswordResetToken;
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
    if (process.env.ALLOW_DEMO_LOGIN !== 'true')
        return null;
    const csvPath = [
        process.env.SEED_CSV ? path_1.default.resolve(process.env.SEED_CSV) : '',
        path_1.default.resolve(process.cwd(), 'GigCred_synthetic_10_users.csv'),
        path_1.default.resolve(process.cwd(), 'src', 'data', 'users.csv'),
        path_1.default.resolve(__dirname, '..', 'data', 'users.csv'),
    ].find((candidate) => candidate && fs_1.default.existsSync(candidate));
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
function calculateDemoEmi(principal, annualRate, months) {
    const monthlyRate = annualRate / 1200;
    if (monthlyRate === 0)
        return principal / months;
    const factor = Math.pow(1 + monthlyRate, months);
    return principal * monthlyRate * factor / (factor - 1);
}
function getDemoLoans(userId) {
    const user = getDemoUser(userId);
    if (!user)
        return [];
    const debt = Number(user.existing_debt || 0);
    if (!Number.isFinite(debt) || debt <= 0)
        return [];
    const categories = [
        { key: 'credit_card_balance', type: 'Credit Card', lender: 'Demo lender', rate: 36, tenure: 24 },
        { key: 'bnpl_balance', type: 'BNPL', lender: 'Demo lender', rate: 24, tenure: 12 },
        { key: 'vehicle_loan_outstanding', type: 'Vehicle Loan', lender: 'Demo lender', rate: 12, tenure: 48 },
    ];
    const loans = categories
        .map((category) => ({ ...category, outstanding: Number(user[category.key] || 0) }))
        .filter((loan) => Number.isFinite(loan.outstanding) && loan.outstanding > 0);
    const categorizedDebt = loans.reduce((sum, loan) => sum + loan.outstanding, 0);
    const remainingDebt = Math.max(0, debt - categorizedDebt);
    if (remainingDebt > 0) {
        loans.push({
            key: 'existing_debt',
            type: 'Personal Loan',
            lender: 'Demo lender',
            outstanding: remainingDebt,
            rate: 18,
            tenure: 36,
        });
    }
    const monthlyEmi = Number(user.monthly_emi || 0);
    return loans.map((loan, index) => ({
        id: `demo-${userId.toUpperCase()}-${index + 1}`,
        type: loan.type,
        lender: loan.lender,
        outstanding: +loan.outstanding.toFixed(2),
        rate: loan.rate,
        tenure: loan.tenure,
        emi: +(monthlyEmi > 0
            ? monthlyEmi * loan.outstanding / debt
            : calculateDemoEmi(loan.outstanding, loan.rate, loan.tenure)).toFixed(2),
        createdAt: null,
        updatedAt: null,
    }));
}
// Local in-memory store for development/offline fallback
const localUsers = new Map();
const localVerificationCodes = new Map();
const localResetTokens = new Map();
async function createOrUpdateUser(userData) {
    const userId = userData.userId || userData.user_id;
    if (!userId)
        throw new Error('userId is required');
    localUsers.set(String(userId).toUpperCase(), { ...userData });
    if (userData.email) {
        localUsers.set(String(userData.email).toLowerCase(), { ...userData });
    }
    try {
        const db = (0, firebaseAdmin_1.getDb)();
        await db.collection('users').doc(String(userId).toUpperCase()).set(userData, { merge: true });
    }
    catch (error) {
        console.warn('Firestore write failed, saved to local cache:', error instanceof Error ? error.message : error);
    }
    return userData;
}
async function storeEmailVerificationCode(email, code, expiresAt) {
    const normalizedEmail = email.trim().toLowerCase();
    localVerificationCodes.set(normalizedEmail, { code, expiresAt: expiresAt.getTime() });
    try {
        const db = (0, firebaseAdmin_1.getDb)();
        await db.collection('verificationCodes').doc(normalizedEmail).set({
            code,
            expiresAt: firebaseAdmin_1.Timestamp.fromDate(expiresAt),
            createdAt: firebaseAdmin_1.Timestamp.now(),
        });
    }
    catch (error) {
        console.warn('Firestore verificationCode store failed, saved to local cache:', error instanceof Error ? error.message : error);
    }
}
async function verifyEmailCodeRecord(email, code) {
    const normalizedEmail = email.trim().toLowerCase();
    const local = localVerificationCodes.get(normalizedEmail);
    if (local) {
        if (Date.now() <= local.expiresAt && local.code === code.trim()) {
            localVerificationCodes.delete(normalizedEmail);
            return true;
        }
    }
    try {
        const db = (0, firebaseAdmin_1.getDb)();
        const doc = await db.collection('verificationCodes').doc(normalizedEmail).get();
        if (doc.exists) {
            const data = doc.data();
            const expiryMillis = data?.expiresAt?.toMillis?.();
            if (typeof expiryMillis === 'number' && Date.now() <= expiryMillis && data?.code === code.trim()) {
                await doc.ref.delete();
                return true;
            }
        }
    }
    catch (error) {
        console.warn('Firestore verification code check failed:', error instanceof Error ? error.message : error);
    }
    return false;
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
        console.warn('Firestore unavailable; using local cache or demo data:', error instanceof Error ? error.message : error);
    }
    const local = localUsers.get(userId.toUpperCase());
    if (local) {
        const data = { ...local };
        delete data.passwordHash;
        delete data.password;
        return { userId: userId.toUpperCase(), ...data };
    }
    const data = getDemoUser(userId);
    if (!data)
        return null;
    delete data.passwordHash;
    delete data.password;
    return { userId: userId.toUpperCase(), ...data };
}
async function getUserAuthRecord(identifier) {
    const normalized = identifier.trim();
    try {
        const users = (0, firebaseAdmin_1.getDb)().collection('users');
        if (normalized.includes('@')) {
            const snapshot = await users.where('email', '==', normalized.toLowerCase()).limit(1).get();
            if (!snapshot.empty) {
                const user = snapshot.docs[0];
                return { userId: user.id, ...(user.data() || {}) };
            }
        }
        else {
            const snapshot = await users.doc(normalized.toUpperCase()).get();
            if (snapshot.exists)
                return { userId: snapshot.id, ...(snapshot.data() || {}) };
        }
    }
    catch (error) {
        console.warn('Firestore unavailable; falling back to local cache or demo data:', error instanceof Error ? error.message : error);
    }
    const local = localUsers.get(normalized.toLowerCase()) || localUsers.get(normalized.toUpperCase());
    if (local) {
        return { userId: String(local.user_id || local.userId || normalized).toUpperCase(), ...local };
    }
    const data = getDemoUser(normalized);
    return data ? { userId: String(data.user_id || normalized).toUpperCase(), ...data } : null;
}
async function updateUserProfile(userId, profile) {
    const local = localUsers.get(userId.toUpperCase());
    if (local) {
        Object.assign(local, profile, { updatedAt: new Date().toISOString() });
        if (profile.email) {
            localUsers.set(profile.email.toLowerCase(), local);
        }
    }
    try {
        const ref = (0, firebaseAdmin_1.getDb)().collection('users').doc(userId);
        const snap = await ref.get();
        if (snap.exists) {
            const updatedAt = firebaseAdmin_1.Timestamp.now();
            await ref.update({ ...profile, updatedAt });
            const updatedProfile = { userId: snap.id, ...(snap.data() || {}), ...profile, updatedAt };
            delete updatedProfile.passwordHash;
            delete updatedProfile.password;
            return updatedProfile;
        }
    }
    catch (error) {
        console.warn('Firestore updateUserProfile error, local used:', error);
    }
    if (local) {
        const safe = { ...local };
        delete safe.passwordHash;
        delete safe.password;
        return safe;
    }
    return null;
}
async function updateUserPhoto(userId, profilePhoto) {
    const local = localUsers.get(userId.toUpperCase());
    if (local) {
        local.profilePhoto = profilePhoto;
        local.updatedAt = new Date().toISOString();
    }
    try {
        const ref = (0, firebaseAdmin_1.getDb)().collection('users').doc(userId);
        const snap = await ref.get();
        if (snap.exists) {
            const updatedAt = firebaseAdmin_1.Timestamp.now();
            await ref.update({ profilePhoto, updatedAt });
            const updatedProfile = {
                userId: snap.id,
                ...(snap.data() || {}),
                profilePhoto,
                updatedAt,
            };
            delete updatedProfile.passwordHash;
            delete updatedProfile.password;
            return updatedProfile;
        }
    }
    catch (error) {
        console.warn('Firestore updateUserPhoto error, local used:', error);
    }
    if (local) {
        const safe = { ...local };
        delete safe.passwordHash;
        delete safe.password;
        return safe;
    }
    return null;
}
async function updateUserPassword(userId, passwordHash) {
    const local = localUsers.get(userId.toUpperCase());
    if (local) {
        local.passwordHash = passwordHash;
        local.password = null;
        local.updatedAt = new Date().toISOString();
    }
    try {
        const ref = (0, firebaseAdmin_1.getDb)().collection('users').doc(userId);
        const snap = await ref.get();
        if (snap.exists) {
            await ref.update({ passwordHash, password: null, updatedAt: firebaseAdmin_1.Timestamp.now() });
            return true;
        }
    }
    catch (error) {
        console.warn('Firestore updateUserPassword error:', error);
    }
    return !!local;
}
async function createPasswordResetToken(userId, token, expiresAt) {
    localResetTokens.set(token, { userId, expiresAt: expiresAt.getTime() });
    try {
        const tokenRef = (0, firebaseAdmin_1.getDb)().collection('passwordResetTokens').doc(token);
        await tokenRef.create({
            userId,
            expiresAt: firebaseAdmin_1.Timestamp.fromDate(expiresAt),
            createdAt: firebaseAdmin_1.Timestamp.now(),
        });
    }
    catch (error) {
        console.warn('Firestore reset token write failed, saved to local store:', error instanceof Error ? error.message : error);
    }
}
async function consumePasswordResetToken(token, passwordHash) {
    const local = localResetTokens.get(token);
    if (local && Date.now() <= local.expiresAt) {
        localResetTokens.delete(token);
        await updateUserPassword(local.userId, passwordHash);
        return true;
    }
    try {
        const db = (0, firebaseAdmin_1.getDb)();
        const tokenRef = db.collection('passwordResetTokens').doc(token);
        return await db.runTransaction(async (transaction) => {
            const tokenSnapshot = await transaction.get(tokenRef);
            if (!tokenSnapshot.exists)
                return false;
            const reset = tokenSnapshot.data();
            const expiryMillis = reset?.expiresAt?.toMillis?.();
            const userId = typeof reset?.userId === 'string' ? reset.userId : '';
            if (!userId || typeof expiryMillis !== 'number' || expiryMillis <= Date.now()) {
                transaction.delete(tokenRef);
                return false;
            }
            const userRef = db.collection('users').doc(userId);
            const userSnapshot = await transaction.get(userRef);
            if (!userSnapshot.exists) {
                transaction.delete(tokenRef);
                return false;
            }
            transaction.update(userRef, {
                passwordHash,
                password: null,
                updatedAt: firebaseAdmin_1.Timestamp.now(),
            });
            transaction.delete(tokenRef);
            return true;
        });
    }
    catch (error) {
        console.warn('Firestore consumePasswordResetToken error:', error);
        return false;
    }
}
async function listLoans(userId) {
    try {
        const snap = await (0, firebaseAdmin_1.getDb)().collection('users').doc(userId).collection('loans').orderBy('createdAt', 'desc').get();
        if (snap.docs.length) {
            return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        }
    }
    catch (error) {
        console.warn('Firestore unavailable; using development demo loans:', error instanceof Error ? error.message : error);
    }
    return getDemoLoans(userId);
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
    try {
        const snap = await (0, firebaseAdmin_1.getDb)()
            .collection('users')
            .doc(userId)
            .collection('creditReports')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        if (snap.empty)
            return null;
        const doc = snap.docs[0];
        return {
            id: doc.id,
            ...doc.data(),
        };
    }
    catch (error) {
        console.warn('Firestore unavailable; credit health unavailable locally:', error instanceof Error ? error.message : error);
        return null;
    }
}
