"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadUsers = loadUsers;
exports.findUser = findUser;
exports.getSafeUser = getSafeUser;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let usersCache = [];
function loadUsers() {
    if (usersCache.length > 0)
        return usersCache;
    const csvPath = path_1.default.join(__dirname, '..', 'data', 'users.csv');
    const raw = fs_1.default.readFileSync(csvPath, 'utf-8');
    const lines = raw.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    usersCache = lines.slice(1).map(line => {
        const values = line.split(',');
        const record = {};
        headers.forEach((h, i) => {
            const v = values[i]?.trim();
            record[h] = isNaN(Number(v)) || v === '' ? v : Number(v);
        });
        return record;
    });
    return usersCache;
}
function findUser(userId) {
    return loadUsers().find(u => u.user_id === userId);
}
function getSafeUser(user) {
    const { password, ...safe } = user;
    return safe;
}
