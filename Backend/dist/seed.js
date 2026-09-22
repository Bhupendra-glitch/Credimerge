"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const firebaseAdmin_1 = require("./config/firebaseAdmin");
const authService_1 = require("./services/authService");
dotenv_1.default.config();
function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    const headerLine = lines.shift();
    if (!headerLine)
        return [];
    const headers = headerLine.split(',').map((h) => h.trim());
    return lines.map((line) => {
        const values = line.split(',');
        const row = {};
        headers.forEach((header, index) => {
            const value = values[index]?.trim() ?? '';
            row[header] =
                value !== '' && !Number.isNaN(Number(value))
                    ? Number(value)
                    : value;
        });
        return row;
    });
}
async function main() {
    const csvPath = process.env.SEED_CSV ||
        path_1.default.resolve(__dirname, 'data', 'users.csv');
    const rows = parseCsv(fs_1.default.readFileSync(csvPath, 'utf8'));
    if (!rows.length) {
        throw new Error('No users found in seed CSV');
    }
    for (const row of rows) {
        const userId = String(row.user_id || '').trim().toUpperCase();
        const password = String(row.password || '');
        if (!userId || !password)
            continue;
        const { password: _password, ...profile } = row;
        const passwordHash = await (0, authService_1.hashPassword)(password);
        await (0, firebaseAdmin_1.getDb)().collection('users').doc(userId).set({
            ...profile,
            passwordHash,
            createdAt: firebaseAdmin_1.Timestamp.now(),
            updatedAt: firebaseAdmin_1.Timestamp.now(),
        }, { merge: true });
        console.log('Seeded ' + userId);
    }
    console.log('Seed completed: ' + rows.length + ' users processed');
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
