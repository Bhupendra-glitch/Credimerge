"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const csvService_1 = require("./csvService");
const JWT_SECRET = process.env.JWT_SECRET || 'credimerge_secret';
function login(userId, password) {
    const user = (0, csvService_1.findUser)(userId);
    if (!user) {
        throw new Error('Invalid User ID');
    }
    if (user.password !== password) {
        throw new Error('Incorrect password');
    }
    const token = jsonwebtoken_1.default.sign({ userId: user.user_id, workerType: user.worker_type }, JWT_SECRET, { expiresIn: '24h' });
    return { token, user: (0, csvService_1.getSafeUser)(user) };
}
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
