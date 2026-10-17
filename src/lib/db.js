import fs from 'fs';
import path from 'path';

const defaultDbPath = path.join(process.cwd(), 'src/data/reports_db.json');
const tmpDbPath = '/tmp/reports_db.json';

// In-memory process cache
let inMemoryDb = null;

function getActiveDbPath() {
  if (process.env.VERCEL) {
    return fs.existsSync(tmpDbPath) ? tmpDbPath : defaultDbPath;
  }
  return defaultDbPath;
}

export function readDb() {
  if (inMemoryDb) {
    return inMemoryDb;
  }

  const targetPath = getActiveDbPath();
  try {
    if (!fs.existsSync(targetPath)) {
      if (targetPath !== defaultDbPath && fs.existsSync(defaultDbPath)) {
        const raw = fs.readFileSync(defaultDbPath, 'utf-8');
        inMemoryDb = JSON.parse(raw);
        return inMemoryDb;
      }
      return { students: [], reports: [], users: [], institutions: [], leaveRequests: [], teacher_groups: [], foodMenus: [] };
    }
    const data = fs.readFileSync(targetPath, 'utf-8');
    const parsed = JSON.parse(data);
    if (!parsed.institutions) parsed.institutions = [];
    if (!parsed.leaveRequests) parsed.leaveRequests = [];
    if (!parsed.students) parsed.students = [];
    if (!parsed.reports) parsed.reports = [];
    if (!parsed.users) parsed.users = [];
    if (!parsed.teacher_groups) parsed.teacher_groups = [];
    if (!parsed.foodMenus) parsed.foodMenus = [];
    inMemoryDb = parsed;
    return parsed;
  } catch (error) {
    console.warn("DB Read Notice (using fallback):", error.message);
    return { students: [], reports: [], users: [], institutions: [], leaveRequests: [], teacher_groups: [], foodMenus: [] };
  }
}

export function writeDb(data) {
  inMemoryDb = data;

  if (process.env.VERCEL) {
    try {
      fs.writeFileSync(tmpDbPath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.warn("Vercel /tmp write error:", e.message);
      return false;
    }
  }

  try {
    fs.writeFileSync(defaultDbPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.warn("Local DB Write Notice:", error.message);
    return false;
  }
}
