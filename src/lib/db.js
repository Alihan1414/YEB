import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'src/data/reports_db.json');

function ensureDb() {
  if (!fs.existsSync(dbPath)) {
    const initialData = { students: [], reports: [], users: [] };
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

export function readDb() {
  ensureDb();
  try {
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error("DB Read Error:", error);
    return { students: [], reports: [], users: [] };
  }
}

export function writeDb(data) {
  ensureDb();
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error("DB Write Error:", error);
    return false;
  }
}
