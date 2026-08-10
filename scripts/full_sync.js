/**
 * full_sync.js
 * Local JSON veritabanındaki tüm verileri Firestore'a aktarır (PUSH).
 */

const fs = require('fs');
const path = require('path');

const FIREBASE_API_KEY    = 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
const FIREBASE_PROJECT_ID = 'vision-b1ad5';
const BASE_FS = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const dbPath = path.join(__dirname, '../src/data/reports_db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

async function patchFirestore(docPath, fields) {
  const url = `${BASE_FS}/${docPath}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(`Firestore error on ${docPath}: ${JSON.stringify(data.error)}`);
  }
  return data;
}

function normalizeEmail(raw) {
  if (!raw) return '';
  const parts = raw.split('@');
  if (parts.length === 2 && !parts[1].includes('.')) return `${parts[0]}@${parts[1]}.com`;
  return raw;
}

async function run() {
  console.log('🔄 Bulut Eşitlemesi Başlatıldı...');

  // 1. Kurumları Eşitle
  console.log('\n--- 🏢 KURUMLAR EŞİTLENİYOR ---');
  for (const inst of (db.institutions || [])) {
    try {
      await patchFirestore(`institutions/${inst.id}`, {
        id:           { stringValue: inst.id },
        name:         { stringValue: inst.name },
        email:        { stringValue: inst.email },
        logoUrl:      { stringValue: inst.logoUrl || '' },
        primaryColor: { stringValue: inst.primaryColor || '#06429c' },
        disabled:     { booleanValue: !!inst.disabled }
      });
      console.log(`✅ Kurum Eşitlendi: ${inst.name} (${inst.id})`);
    } catch (e) {
      console.error(`❌ Kurum Hatası (${inst.id}):`, e.message);
    }
  }

  // 2. Kullanıcıları / Yöneticileri Eşitle
  console.log('\n--- 👥 KULLANICILAR EŞİTLENİYOR ---');
  for (const user of (db.users || [])) {
    try {
      await patchFirestore(`users/${user.id}`, {
        name:            { stringValue: user.name || '' },
        email:           { stringValue: user.email || '' },
        role:            { stringValue: user.role || 'teacher' },
        institutionId:   { stringValue: user.institutionId || '' },
        institutionName: { stringValue: user.institutionName || '' },
        logoUrl:         { stringValue: user.logoUrl || '' },
        primaryColor:    { stringValue: user.primaryColor || '#06429c' },
        disabled:        { booleanValue: !!user.disabled }
      });
      console.log(`✅ Kullanıcı Eşitlendi: ${user.name} (${user.email})`);
    } catch (e) {
      console.error(`❌ Kullanıcı Hatası (${user.email}):`, e.message);
    }
  }

  // 3. Öğrencileri Eşitle
  console.log('\n--- 🎓 ÖĞRENCİLER EŞİTLENİYOR ---');
  for (const st of (db.students || [])) {
    let success = false;
    let attempts = 0;
    while (!success && attempts < 3) {
      try {
        attempts++;
        await patchFirestore(`students/${st.id}`, {
          name:           { stringValue: st.name || '' },
          surname:        { stringValue: st.surname || '' },
          class:          { stringValue: st.class || '' },
          parent_phone:   { stringValue: st.parent_phone || '' },
          institution_id: { stringValue: st.institution_id || 'yamanevler' },
          created_at:     { timestampValue: st.created_at || new Date().toISOString() }
        });
        console.log(`✅ Öğrenci Eşitlendi: ${st.name} ${st.surname} (${st.id})`);
        success = true;
      } catch (e) {
        console.error(`⚠️ Deneme ${attempts} - Öğrenci Hatası (${st.name} ${st.surname}):`, e.message);
        await new Promise(r => setTimeout(r, 500));
      }
    }
    await new Promise(r => setTimeout(r, 60));
  }

  console.log('\n🎉 Eşitleme İşlemi Tamamlandı!');
}

run().catch(console.error);
