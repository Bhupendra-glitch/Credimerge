"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const authService_1 = require("../services/authService");
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const token = authHeader.slice(7).trim();
        const payload = (0, authService_1.verifyToken)(token);
        if (!payload.userId)
            return res.status(401).json({ error: 'Invalid token' });
        req.user = payload;
        next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
