"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.validatePasswordChange = validatePasswordChange;
exports.changePassword = changePassword;
exports.verifyToken = verifyToken;
exports.hashPassword = hashPassword;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const firestoreService_1 = require("./firestoreService");
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET || (() => {
    throw new Error('JWT_SECRET is required');
})();
async function login(userId, password) {
    const user = await (0, firestoreService_1.getUserAuthRecord)(userId.trim());
    if (!user)
        throw new Error('Invalid email/User ID or password.');
    let ok = false;
    if (user.passwordHash)
        ok = await bcryptjs_1.default.compare(password, user.passwordHash);
    else if (process.env.NODE_ENV !== 'production'
        && process.env.ALLOW_DEMO_LOGIN === 'true'
        && user.password)
        ok = user.password === password;
    if (!ok)
        throw new Error('Invalid email/User ID or password.');
    const token = jsonwebtoken_1.default.sign({ userId: user.userId, workerType: user.worker_type || user.workerType || null }, JWT_SECRET, { expiresIn: '24h' });
    const safe = { ...user };
    delete safe.password;
    delete safe.passwordHash;
    return { token, user: safe };
}
function validatePasswordChange(newPassword, confirmPassword) {
    if (newPassword.length < 12)
        throw new Error('New password must be at least 12 characters.');
    if (Buffer.byteLength(newPassword, 'utf8') > 72) {
        throw new Error('New password must be no longer than 72 UTF-8 bytes.');
    }
    if (newPassword !== confirmPassword)
        throw new Error('New passwords do not match.');
}
async function changePassword(userId, currentPassword, newPassword, confirmPassword) {
    validatePasswordChange(newPassword, confirmPassword);
    if (!currentPassword)
        throw new Error('Current password is required.');
    if (currentPassword === newPassword)
        throw new Error('Choose a password different from your current password.');
    const user = await (0, firestoreService_1.getUserAuthRecord)(userId);
    if (!user)
        throw new Error('User account was not found.');
    const currentPasswordMatches = user.passwordHash
        ? await bcryptjs_1.default.compare(currentPassword, user.passwordHash)
        : user.password === currentPassword;
    if (!currentPasswordMatches)
        throw new Error('Current password is incorrect.');
    const passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
    const updated = await (0, firestoreService_1.updateUserPassword)(userId, passwordHash);
    if (!updated)
        throw new Error('Password changes are unavailable for demo accounts.');
}
function verifyToken(token) {
    if (token.startsWith('demo-')) {
        const userId = token.slice('demo-'.length).trim().toUpperCase();
        if (!userId)
            throw new Error('Invalid demo token');
        return { userId };
    }
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
function hashPassword(password) {
    return bcryptjs_1.default.hash(password, 12);
}
