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
const emiService_1 = require("./emiService");
function getDemoUser(userId) {
    if (process.env.NODE_ENV === 'production')
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
    try {
        const snap = await (0, firebaseAdmin_1.getDb)().collection('users').doc(userId).collection('loans').orderBy('createdAt', 'desc').get();
        if (snap.docs.length) {
            return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        }
    }
    catch (error) {
<<<<<<< HEAD
        console.warn('Firestore unavailable; using GigCred profile loans:', error instanceof Error ? error.message : error);
    }
    return buildProfileLoans(userId);
}
function buildProfileLoans(userId) {
    if (process.env.NODE_ENV === 'production')
        return [];
    const profile = getDemoUser(userId);
    if (!profile)
        return [];
    const balances = [
        { key: 'credit_card_balance', type: 'Credit Card', rate: 36, tenure: 24 },
        { key: 'bnpl_balance', type: 'BNPL', rate: 24, tenure: 12 },
        { key: 'vehicle_loan_outstanding', type: 'Vehicle Loan', rate: 14, tenure: 36 },
    ];
    const profileDebt = Number(profile.existing_debt || 0);
    const categorizedDebt = balances.reduce((sum, item) => sum + Number(profile[item.key] || 0), 0);
    if (profileDebt > categorizedDebt) {
        balances.push({ key: 'profile_debt', type: 'Other Debt', rate: 18, tenure: 24 });
    }
    const totalEmi = Number(profile.monthly_emi || 0);
    return balances
        .map((item, index) => {
        const outstanding = item.key === 'profile_debt'
            ? Math.max(0, profileDebt - categorizedDebt)
            : Number(profile[item.key] || 0);
        if (outstanding <= 0)
            return null;
        const calculatedEmi = (0, emiService_1.calculateEmi)(outstanding, item.rate, item.tenure);
        const emi = totalEmi > 0 && profileDebt > 0
            ? totalEmi * (outstanding / profileDebt)
            : calculatedEmi;
        return {
            id: `gig-profile-${index + 1}`,
            type: item.type,
            lender: 'GigCred profile estimate',
            outstanding: Math.round(outstanding * 100) / 100,
            rate: item.rate,
            tenure: item.tenure,
            emi: Math.round(emi * 100) / 100,
            createdAt: null,
            updatedAt: null,
            source: 'GigCred profile',
        };
    })
        .filter((loan) => loan !== null);
=======
        console.warn('Firestore unavailable; using development demo loans:', error instanceof Error ? error.message : error);
    }
    return getDemoLoans(userId);
>>>>>>> ed2b486a8d7fb38f44fee62ae9f3cde7c60835cc
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
