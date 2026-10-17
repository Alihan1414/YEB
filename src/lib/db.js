import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'src/data/reports_db.json');

function ensureDb() {
  if (process.env.VERCEL) return;
  try {
    if (!fs.existsSync(dbPath)) {
      const initialData = { students: [], reports: [], users: [], institutions: [], leaveRequests: [], teacher_groups: [], foodMenus: [] };
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2), 'utf-8');
    }
  } catch (e) {
    // Read-only filesystem
  }
}

export function readDb() {
  ensureDb();
  try {
    if (!fs.existsSync(dbPath)) {
      return { students: [], reports: [], users: [], institutions: [], leaveRequests: [], teacher_groups: [], foodMenus: [] };
    }
    const data = fs.readFileSync(dbPath, 'utf-8');
    const parsed = JSON.parse(data);
    // Ensure all required arrays exist
    if (!parsed.institutions) parsed.institutions = [];
    if (!parsed.leaveRequests) parsed.leaveRequests = [];
    if (!parsed.students) parsed.students = [];
    if (!parsed.reports) parsed.reports = [];
    if (!parsed.users) parsed.users = [];
    if (!parsed.teacher_groups) parsed.teacher_groups = [];
    if (!parsed.foodMenus) parsed.foodMenus = [];
    return parsed;
  } catch (error) {
    console.warn("DB Read Notice (using fallback):", error.message);
    return { students: [], reports: [], users: [], institutions: [], leaveRequests: [], teacher_groups: [], foodMenus: [] };
  }
}

export function writeDb(data) {
  if (process.env.VERCEL) return false;
  ensureDb();
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.warn("DB Write Notice (expected in read-only serverless):", error.message);
    return false;
  }
}
