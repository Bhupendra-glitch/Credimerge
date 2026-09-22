import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { getDb, Timestamp } from './config/firebaseAdmin';
import { hashPassword } from './services/authService';

dotenv.config();

function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  const headerLine = lines.shift();
  if (!headerLine) return [];

  const headers = headerLine.split(',').map((h) => h.trim());

  return lines.map((line) => {
    const values = line.split(',');
    const row: Record<string, any> = {};

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
  const candidates = [
    process.env.SEED_CSV ? path.resolve(process.env.SEED_CSV) : '',
    path.resolve(process.cwd(), 'GigCred_synthetic_10_users.csv'),
    path.resolve(__dirname, 'data', 'users.csv'),
  ];
  const csvPath = candidates.find((candidate) => candidate && fs.existsSync(candidate));
  if (!csvPath) throw new Error(`Seed CSV not found. Checked: ${candidates.join('; ')}`);

  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));

  if (!rows.length) {
    throw new Error('No users found in seed CSV');
  }

  for (const row of rows) {
    const userId = String(row.user_id || '').trim().toUpperCase();
    const password = String(row.password || '');

    if (!userId || !password) continue;

    const { password: _password, ...profile } = row;
    const passwordHash = await hashPassword(password);

    await getDb().collection('users').doc(userId).set(
      {
        ...profile,
        passwordHash,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    console.log('Seeded ' + userId);
  }

  console.log('Seed completed: ' + rows.length + ' users processed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
