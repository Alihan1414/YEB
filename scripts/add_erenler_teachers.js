/**
 * add_erenler_teachers.js
 * Çınardere Erenler kurumuna 10 adet öğretmen hesabı ekler.
 * Hem local DB'ye hem de Firestore'a kaydeder.
 */

const fs   = require('fs');
const path = require('path');

const FIREBASE_API_KEY    = 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
const FIREBASE_PROJECT_ID = 'vision-b1ad5';
const BASE_FS = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const dbPath = path.join(__dirname, '../src/data/reports_db.json');
const db     = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

const INST_ID   = 'cinardere-erenler';
const INST_NAME = 'Çınardere Erenler';

const erenlerTeachers = [
  { name: 'Ahmet Hoca',      email: 'ahmet.hoca@erenler.com',      password: 'erenler2026teacher1' },
  { name: 'Mehmet Hoca',    email: 'mehmet.hoca@erenler.com',     password: 'erenler2026teacher2' },
  { name: 'Ali Hoca',       email: 'ali.hoca@erenler.com',        password: 'erenler2026teacher3' },
  { name: 'Mustafa Hoca',   email: 'mustafa.hoca@erenler.com',    password: 'erenler2026teacher4' },
  { name: 'Hüseyin Hoca',   email: 'huseyin.hoca@erenler.com',    password: 'erenler2026teacher5' },
  { name: 'Hasan Hoca',     email: 'hasan.hoca@erenler.com',      password: 'erenler2026teacher6' },
  { name: 'Ömer Hoca',      email: 'omer.hoca@erenler.com',       password: 'erenler2026teacher7' },
  { name: 'İbrahim Hoca',   email: 'ibrahim.hoca@erenler.com',    password: 'erenler2026teacher8' },
  { name: 'Yusuf Hoca',     email: 'yusuf.hoca@erenler.com',      password: 'erenler2026teacher9' },
  { name: 'Osman Hoca',     email: 'osman.hoca@erenler.com',      password: 'erenler2026teacher10' }
];

async function patchFirestore(docPath, fields) {
  const url = `${BASE_FS}/${docPath}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  return await res.json();
}

async function run() {
  console.log('🔄 Çınardere Erenler 10 Öğretmen Hesabı Ekleniyor...\n');

  if (!db.users) db.users = [];

  let addedCount = 0;
  for (let i = 0; i < erenlerTeachers.length; i++) {
    const t = erenlerTeachers[i];
    const uid = `teacher-erenler-${i + 1}`;

    const teacherData = {
      id: uid,
      name: t.name,
      email: t.email,
      password: t.password,
      role: 'teacher',
      institutionId: INST_ID,
      institutionName: INST_NAME,
      logoUrl: '/cinardere-logo.png',
      primaryColor: '#0f172a',
      disabled: false,
      created_at: new Date().toISOString()
    };

    // 1. Local DB'ye ekle (mevcut değilse)
    const existsInDb = db.users.some(u => u.email === t.email || u.id === uid);
    if (!existsInDb) {
      db.users.push(teacherData);
    } else {
      const idx = db.users.findIndex(u => u.email === t.email || u.id === uid);
      db.users[idx] = { ...db.users[idx], ...teacherData };
    }

    // 2. Firestore'a ekle
    try {
      await patchFirestore(`users/${uid}`, {
        name:            { stringValue: t.name },
        email:           { stringValue: t.email },
        password:        { stringValue: t.password },
        role:            { stringValue: 'teacher' },
        institutionId:   { stringValue: INST_ID },
        institutionName: { stringValue: INST_NAME },
        logoUrl:         { stringValue: '/cinardere-logo.png' },
        primaryColor:    { stringValue: '#0f172a' },
        disabled:        { booleanValue: false }
      });
      console.log(`✅ Firestore & Local DB'ye Eklendi: ${t.name} (${t.email})`);
      addedCount++;
    } catch (e) {
      console.error(`❌ Firestore Hatası (${t.name}):`, e.message);
    }
  }

  // Kaydet
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
  console.log(`\n🎉 İşlem Tamamlandı! ${addedCount} öğretmen hesabı aktif edildi.`);
}

run().catch(console.error);
