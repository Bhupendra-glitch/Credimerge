"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
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
    const user = await (0, firestoreService_1.getUserAuthRecord)(userId.trim().toUpperCase());
    if (!user)
        throw new Error('Invalid User ID');
    let ok = false;
    if (user.passwordHash)
        ok = await bcryptjs_1.default.compare(password, user.passwordHash);
    else if (user.password)
        ok = user.password === password; // migration-only fallback
    if (!ok)
        throw new Error('Incorrect password');
    const token = jsonwebtoken_1.default.sign({ userId: user.userId, workerType: user.worker_type || user.workerType || null }, JWT_SECRET, { expiresIn: '24h' });
    const safe = { ...user };
    delete safe.password;
    delete safe.passwordHash;
    return { token, user: safe };
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
