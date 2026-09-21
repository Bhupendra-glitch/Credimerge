"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const authService_1 = require("../services/authService");
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        req.user = (0, authService_1.verifyToken)(token);
        next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
