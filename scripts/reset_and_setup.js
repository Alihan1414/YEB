/**
 * reset_and_setup.js
 * 1. Kurumların içindeki VERİLERİ sıfırla (students, reports, leaveRequests)
 * 2. Kılıçaslan logosu / primaryColor güncelle (turkuaz: #00b4b6)
 * 3. Pendik Talebe Yurdu kurumunu ekle
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../src/data/reports_db.json');

// Mevcut DB'yi oku
const raw = fs.readFileSync(dbPath, 'utf-8');
const db = JSON.parse(raw);

// ── 1. Veri sıfırlama ─────────────────────────────────────────
db.students = [];
db.reports = [];
db.leaveRequests = [];
console.log('✅ students, reports, leaveRequests temizlendi.');

// ── 2. Kılıçaslan logosu ve renk güncelle ───────────────────────
// Kurumlar listesinde güncelle
const kilicIdx = db.institutions.findIndex(i => i.id === 'bolu-kilicaslan');
if (kilicIdx >= 0) {
  db.institutions[kilicIdx].logoUrl = '/kilicaslan-logo.png'; // aynı path, yeni görsel
  db.institutions[kilicIdx].primaryColor = '#009b9e'; // turkuaz (logodaki renk)
  console.log('✅ Bolu Kılıçaslan logoUrl ve primaryColor güncellendi.');
}

// Kullanıcılar listesinde de güncelle
const kilicUserIdx = db.users.findIndex(u => u.institutionId === 'bolu-kilicaslan');
if (kilicUserIdx >= 0) {
  db.users[kilicUserIdx].logoUrl = '/kilicaslan-logo.png';
  db.users[kilicUserIdx].primaryColor = '#009b9e';
  console.log('✅ Kılıçaslan kullanıcısı güncellendi.');
}

// ── 3. Pendik Talebe Yurdu ekle ─────────────────────────────────
const PENDIK_ID = 'pendik-talebe-yurdu';
const PENDIK_EMAIL = 'pty@2026';
const PENDIK_PASSWORD = 'pendikmerkez';

// Zaten varsa kaldır (idempotent)
db.institutions = db.institutions.filter(i => i.id !== PENDIK_ID);
db.users = db.users.filter(u => u.institutionId !== PENDIK_ID);

// Kurum ekle
db.institutions.push({
  id: PENDIK_ID,
  name: 'Pendik Talebe Yurdu',
  email: PENDIK_EMAIL,
  logoUrl: '/pendik-logo.png',
  primaryColor: '#b8962e', // altın rengi (logodaki renk)
  enabledModules: { ai: true, leave: true, tv: true, weekly: true },
  disabled: false,
  created_at: new Date().toISOString()
});

// Yönetici kullanıcı ekle
const adminUid = `admin-${PENDIK_ID}-${Date.now()}`;
db.users.push({
  id: adminUid,
  name: 'Pendik Talebe Yurdu Yöneticisi',
  email: PENDIK_EMAIL,
  password: PENDIK_PASSWORD,
  role: 'admin',
  institutionId: PENDIK_ID,
  institutionName: 'Pendik Talebe Yurdu',
  logoUrl: '/pendik-logo.png',
  primaryColor: '#b8962e',
  disabled: false,
  created_at: new Date().toISOString()
});

// leaveSettings için de ekle
if (!db.leaveSettings) db.leaveSettings = {};
if (!db.leaveSettings[PENDIK_ID]) {
  db.leaveSettings[PENDIK_ID] = { enabled: true, assignedTeacherId: '' };
}

console.log('✅ Pendik Talebe Yurdu kurumu ve yöneticisi eklendi.');

// ── DB'yi kaydet ─────────────────────────────────────────────────
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
console.log('✅ Veritabanı kaydedildi:', dbPath);
console.log('\nKurumlar:');
db.institutions.forEach(i => console.log(`  • ${i.name} (${i.id}) — ${i.email}`));
