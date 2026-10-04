const fs = require('fs');
const path = require('path');

const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';

const DB_PATH = path.join(__dirname, '..', 'src', 'data', 'reports_db.json');

async function deleteFirestoreCollection(collectionName) {
  console.log(`Checking Firestore collection: ${collectionName}...`);
  try {
    const listUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionName}?key=${FIREBASE_API_KEY}&pageSize=500`;
    const res = await fetch(listUrl);
    if (!res.ok) {
      console.log(`Failed to list ${collectionName}: ${res.status} ${res.statusText}`);
      return;
    }
    const data = await res.json();
    const docs = data.documents || [];
    console.log(`Found ${docs.length} documents in Firestore ${collectionName}. Deleting...`);
    
    for (const doc of docs) {
      const deleteUrl = `https://firestore.googleapis.com/v1/${doc.name}?key=${FIREBASE_API_KEY}`;
      const delRes = await fetch(deleteUrl, { method: 'DELETE' });
      if (delRes.ok) {
        console.log(`  ✓ Deleted: ${doc.name.split('/').pop()}`);
      } else {
        console.warn(`  ✗ Failed to delete ${doc.name}: ${delRes.status}`);
      }
    }
    console.log(`Finished clearing Firestore collection ${collectionName}.`);
  } catch (err) {
    console.error(`Error deleting collection ${collectionName}:`, err);
  }
}

async function resetFirestoreStudents() {
  console.log('Checking Firestore students to reset report counters...');
  try {
    const listUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/students?key=${FIREBASE_API_KEY}&pageSize=500`;
    const res = await fetch(listUrl);
    if (!res.ok) return;
    const data = await res.json();
    const docs = data.documents || [];
    console.log(`Checking ${docs.length} Firestore students...`);
    
    for (const doc of docs) {
      const fields = doc.fields || {};
      const repCount = parseInt(fields.report_count?.integerValue || '0', 10);
      const hasLastReport = !!fields.last_report_date;
      const status = fields.status?.stringValue || '';
      
      if (repCount > 0 || hasLastReport || status !== 'Rapor Yok') {
        const docId = doc.name.split('/').pop();
        // Update fields
        const updateUrl = `https://firestore.googleapis.com/v1/${doc.name}?updateMask.fieldPaths=report_count&updateMask.fieldPaths=last_report_date&updateMask.fieldPaths=status&key=${FIREBASE_API_KEY}`;
        const patchRes = await fetch(updateUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              report_count: { integerValue: '0' },
              last_report_date: { nullValue: null },
              status: { stringValue: 'Rapor Yok' }
            }
          })
        });
        if (patchRes.ok) {
          console.log(`  ✓ Reset stats for student doc ${docId}`);
        }
      }
    }
  } catch (err) {
    console.warn('Error resetting Firestore students:', err);
  }
}

async function main() {
  console.log('=== STARTING PRODUCTION CLEANUP ===\n');

  // 1. Delete all Firestore reports
  await deleteFirestoreCollection('reports');

  // 2. Delete all Firestore teacher_groups
  await deleteFirestoreCollection('teacher_groups');

  // 3. Reset Firestore students stats
  await resetFirestoreStudents();

  // 4. Update local reports_db.json
  console.log('\nUpdating local reports_db.json...');
  if (fs.existsSync(DB_PATH)) {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const db = JSON.parse(raw);

    // Remove user 'özmen@01.com'
    const origUserCount = (db.users || []).length;
    db.users = (db.users || []).filter(u => {
      const email = (u.email || '').toLowerCase().trim();
      return email !== 'özmen@01.com' && email !== 'ozmen@01.com';
    });
    console.log(`Removed ${origUserCount - db.users.length} duplicate Alihan Özmen user (özmen@01.com). Remaining users: ${db.users.length}`);

    // Clear reports
    const origReportCount = (db.reports || []).length;
    db.reports = [];
    console.log(`Cleared all local reports (${origReportCount} -> 0).`);

    // Clear teacher_groups
    const origGroupCount = (db.teacher_groups || []).length;
    db.teacher_groups = [];
    console.log(`Cleared all local teacher groups (${origGroupCount} -> 0).`);

    // Reset students report_count, status, last_report_date, checkout_time
    let resetStudentsCount = 0;
    db.students = (db.students || []).map(st => {
      resetStudentsCount++;
      return {
        ...st,
        report_count: 0,
        last_report_date: null,
        status: 'Rapor Yok',
        checkout_time: null,
        score: 0
      };
    });
    console.log(`Reset report counters for ${resetStudentsCount} students.`);

    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    console.log('✓ Successfully wrote changes to reports_db.json');
  } else {
    console.warn(`reports_db.json not found at ${DB_PATH}`);
  }

  console.log('\n=== PRODUCTION CLEANUP COMPLETE ===');
}

main().catch(console.error);
