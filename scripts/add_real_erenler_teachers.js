/**
 * add_real_erenler_teachers.js
 * Çınardere Erenler kurumu öğretmen hesaplarını ekler.
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

const teachers = [
  { name: 'Rıdvan Çevik',     email: 'cevik@08.com',            password: 'rıdvan2026' },
  { name: 'Ruçhan Başkaya',   email: 'baskaya@09.com',           password: 'kemal2026' },
  { name: 'Emir',             email: 'emir@05.com',              password: 'emir2026' },
  { name: 'Furkan Şahin',     email: 'furkan@07.com',            password: 'şahin2026' },
  { name: 'Ali Aydın',        email: 'aliaydin@03.com',          password: 'çınardere2026' },
  { name: 'Selim Kaya',       email: 'kaya@06.com',              password: 'selim2026' },
  { name: 'Aydın Hoca',       email: 'aydin@04.com',             password: 'aydin2026' },
  { name: 'Arslan Hoca',      email: 'arslancinardere@02.com',   password: 'arslan02' },
  { name: 'Süleyman Yenice',  email: 'yenicecinardere@01.com',   password: 'yenice01' },
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
  console.log('🔄 Gerçek Çınardere Erenler Öğretmen Hesapları Ekleniyor...\n');

  if (!db.users) db.users = [];

  // Önce eski öğretmenleri temizle (yönetici hariç)
  db.users = db.users.filter(u => !(u.institutionId === INST_ID && u.role === 'teacher'));

  let addedCount = 0;

  for (let i = 0; i < teachers.length; i++) {
    const t = teachers[i];
    const uid = `teacher-erenler-real-${i + 1}`;

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

    // 1. Local DB'ye ekle
    db.users.push(teacherData);

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
      console.log(`✅ Firestore & Local DB'ye Eklendi: ${t.name} | Kullanıcı Adı: ${t.email} | Şifre: ${t.password}`);
      addedCount++;
    } catch (e) {
      console.error(`❌ Firestore Hatası (${t.name}):`, e.message);
    }
  }

  // Kaydet
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
  console.log(`\n🎉 İşlem Tamamlandı! ${addedCount} öğretmen hesabı aktifleştirildi.`);
}

run().catch(console.error);
