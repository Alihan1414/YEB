import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'src/data/reports_db.json');

function ensureDb() {
  if (!fs.existsSync(dbPath)) {
    const initialData = { students: [], reports: [], users: [], institutions: [], leaveRequests: [] };
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

export function readDb() {
  ensureDb();
  try {
    const data = fs.readFileSync(dbPath, 'utf-8');
    const parsed = JSON.parse(data);
    // Ensure all required arrays exist
    if (!parsed.institutions) parsed.institutions = [];
    if (!parsed.leaveRequests) parsed.leaveRequests = [];
    if (!parsed.students) parsed.students = [];
    if (!parsed.reports) parsed.reports = [];
    if (!parsed.users) parsed.users = [];
    return parsed;
  } catch (error) {
    console.error("DB Read Error:", error);
    return { students: [], reports: [], users: [], institutions: [], leaveRequests: [] };
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
