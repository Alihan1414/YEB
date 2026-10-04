const fs = require('fs');
const path = require('path');

const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';
const BASE_FS = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const dbPath = path.join(__dirname, '../src/data/reports_db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

async function setFirestoreLeave(instId) {
  try {
    const url = `${BASE_FS}/leaveSettings/${instId}?key=${FIREBASE_API_KEY}`;
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          enabled: { booleanValue: true },
          assignedTeacherId: { stringValue: '' }
        }
      })
    });
    console.log(`✅ Firestore leaveSettings/${instId} enabled: true yapıldı.`);
  } catch (e) {
    console.warn(`⚠️ Firestore hata (${instId}):`, e.message);
  }
}

async function run() {
  console.log('🔄 Bütün kurumlarda izin yönetimi daimi olarak açılıyor...');

  if (!db.leaveSettings) db.leaveSettings = {};

  (db.institutions || []).forEach(inst => {
    if (!inst.enabledModules) inst.enabledModules = {};
    inst.enabledModules.leave = true;

    db.leaveSettings[inst.id] = {
      enabled: true,
      assignedTeacherId: db.leaveSettings[inst.id]?.assignedTeacherId || ''
    };
  });

  // Ekstra garanti kurumlar
  ['bolu-kilicaslan', 'cinardere-erenler', 'yamanevler', 'pendik-talebe-yurdu'].forEach(id => {
    if (!db.leaveSettings[id]) {
      db.leaveSettings[id] = { enabled: true, assignedTeacherId: '' };
    } else {
      db.leaveSettings[id].enabled = true;
    }
  });

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
  console.log('✅ Local DB leaveSettings ve enabledModules güncellendi.');

  for (const id of ['bolu-kilicaslan', 'cinardere-erenler', 'yamanevler', 'pendik-talebe-yurdu']) {
    await setFirestoreLeave(id);
  }

  console.log('🎉 Tüm kurumlarda izin yönetimi aktif ve kilitli!');
}

run().catch(console.error);
