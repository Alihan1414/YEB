/**
 * remove_erenler_teachers.js
 * Çınardere Erenler kurumuna eklenen örnek 10 öğretmen hesabını siler.
 */

const fs   = require('fs');
const path = require('path');

const FIREBASE_API_KEY    = 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
const FIREBASE_PROJECT_ID = 'vision-b1ad5';
const BASE_FS = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const dbPath = path.join(__dirname, '../src/data/reports_db.json');
const db     = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

async function deleteDoc(docPath) {
  const url = `${BASE_FS}/${docPath}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url, { method: 'DELETE' });
  return res.ok;
}

async function run() {
  console.log('🗑️ Çınardere Erenler Örnek Öğretmen Hesapları Siliniyor...\n');

  // 1. Local DB'den sil (sadece teacher-erenler- ile başlayanları veya @erenler.com olanları)
  if (db.users) {
    db.users = db.users.filter(u => !(u.institutionId === 'cinardere-erenler' && u.role === 'teacher'));
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
    console.log('✅ Local DB temizlendi.');
  }

  // 2. Firestore'dan sil
  let deletedCount = 0;
  for (let i = 1; i <= 10; i++) {
    const uid = `teacher-erenler-${i}`;
    try {
      await deleteDoc(`users/${uid}`);
      console.log(`❌ Firestore'dan Silindi: ${uid}`);
      deletedCount++;
    } catch (e) {
      console.warn(`⚠️ Silinemedi (${uid}):`, e.message);
    }
  }

  console.log(`\n🎉 Temizlik Tamamlandı! Sizden yeni kullanıcı adı ve şifreler bekleniyor.`);
}

run().catch(console.error);
