const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'src', 'data', 'reports_db.json');

// 80 students from the provided image
const RAW_STUDENTS = [
  // MUH. K. KERİM (K. ZAUZI)
  { name: 'Zeki', surname: 'Endonezyalı' },
  { name: 'Nofiyen', surname: 'Endonezyalı' },
  { name: 'Halid', surname: '' },

  // K.KERİM (M. KALKAN)
  { name: 'Hüseyin Kerim', surname: 'Arı' },

  // K. KERİM (N. YERLİKAYA)
  { name: 'Hassan', surname: 'Wamanga' },
  { name: 'Fakhru Rais Dzarari', surname: 'Malay' },
  { name: 'Prima Wijaya Mahendra', surname: 'Putra' },

  // HAZIRLIK (M.S. ALDEMİR)
  { name: 'Ahmet Yiğit', surname: 'Öksün' },
  { name: 'Osman Enes', surname: 'Özenoğlu' },
  { name: 'Ahmet Emre', surname: 'Levent' },
  { name: 'Taha Emin', surname: 'Gümüş' },
  { name: 'Emirhan', surname: 'Toygar' },
  { name: 'Ahmet Sefa', surname: 'Güneş' },
  { name: 'Furkan Hamza', surname: 'Özdemir' },
  { name: 'Mustafa Emre', surname: 'Uran' },
  { name: 'Yunus Emre', surname: 'Yiğit' },
  { name: 'Alim Taha', surname: 'Akpınar' },
  { name: 'Mustafa', surname: 'Hilmi' },

  // HAZIRLIK (M. ÇETİNKAYA)
  { name: 'Kemal', surname: 'Nurbayev' },
  { name: 'Muhammad Fakhri', surname: 'Akbar' },
  { name: 'Muhammad Abdu Romy Al', surname: 'Aziza' },
  { name: 'Kenryu Hyde', surname: 'Sirodjudin' },
  { name: 'Muhammad Rauza Hudzam', surname: 'Almahi' },
  { name: 'Halil İbrahim', surname: 'Sucu' },
  { name: 'Ahmad', surname: 'Naufal' },
  { name: 'İsmail', surname: 'Abbas' },
  { name: 'Ömer', surname: 'Abbas' },

  // İBTİDAİ (T. GÜNEY)
  { name: 'Kerem', surname: 'Kabak' },
  { name: 'Hasan Furkan', surname: 'Orhan' },
  { name: 'Ömer Faruk', surname: 'Demirci' },
  { name: 'İbrahime', surname: 'Sarba' },
  { name: 'Hakam Abdullah', surname: 'Fatih' },
  { name: 'İbrahim', surname: 'Kenar' },
  { name: 'Mehmet Emin', surname: 'Çelik' },
  { name: 'Muhamad Ihsan Abdul Azis', surname: 'Malik' },
  { name: 'Muhammad Atif Al', surname: 'Farisi' },
  { name: 'Ahmet', surname: 'Fidan' },
  { name: 'Mehmet Onur', surname: 'Keleş' },

  // İBTİDAİ (E. MISIRLI)
  { name: 'Hüseyin Hilmi', surname: 'Ataseven' },
  { name: 'Hanefi Enes', surname: 'Kılıç' },
  { name: 'Nurali', surname: 'Bakhatkhan' },
  { name: 'İsmail', surname: 'Üstün' },
  { name: 'Muhammet Ali', surname: 'Baskın' },
  { name: 'Yavuz Selim', surname: 'Yener' },
  { name: 'Abshir Ahmed', surname: 'Osman' },
  { name: 'Haroune', surname: 'Ouedraga' },
  { name: 'İbrahim', surname: 'Djibo' },
  { name: 'Hazrat', surname: 'Adıgözeloğlu' },
  { name: 'Youssouf', surname: 'Diakite' },

  // İHZARİ (İ. ÇETİNKAYA)
  { name: 'Ahmet Faruk', surname: 'Ağır' },
  { name: 'Ahmet Arif', surname: 'Olğun' },
  { name: 'Haşim', surname: 'Öngür' },
  { name: 'Yunus Emre', surname: 'Erdoğan' },
  { name: 'Hüseyin Hilmi', surname: 'Öztemur' },
  { name: 'Tunahan', surname: 'Kurt' },
  { name: 'Mücahit Mert', surname: 'Demirözü' },
  { name: 'Mehmet Hayati', surname: 'Fidan' },
  { name: 'Mahad Abdirashid', surname: 'Farah' },
  { name: 'Taner', surname: 'Çelik' },
  { name: 'Mehmet Talha', surname: 'Barazama' },
  { name: 'Emirhan', surname: 'Sarı' },
  { name: 'Hamza', surname: 'Akbel' },
  { name: 'Abdirashid Ibrahim', surname: 'Hassan' },
  { name: 'Rıdvan Emir', surname: 'Koşar' },
  { name: 'Khadar Ismail', surname: 'Abokor' },
  { name: 'Ferhat', surname: 'Uyar' },

  // TEKAMÜL ALTI (L.M. KAŞİTOĞLU)
  { name: 'Nazif Can', surname: 'Coşgun' },
  { name: 'Oruç', surname: 'Sandıkçı' },
  { name: 'Mustafa', surname: 'Doğan' },
  { name: 'Emir Salih', surname: 'Gümrük' },
  { name: 'Hilmi Sevban', surname: 'Sarıyar' },
  { name: 'Emre', surname: 'Şimşek' },
  { name: 'Abdullah', surname: 'Kurnaz' },
  { name: 'İsmail Can', surname: 'Tunalı' },
  { name: 'Ahmet Kemal', surname: 'Kocakuzgun' },
  { name: 'Hensarmu Aman', surname: 'Gemechu' },
  { name: 'Mansour', surname: 'Etminan' },
  { name: 'Mehmet Arif', surname: 'Çalışkan' },
  { name: 'Mehmet Emin', surname: 'İnce' },
  { name: 'Mehmet Ali', surname: 'Kavuştur' }
];

async function main() {
  console.log('=== BOLU KILIÇARSLAN ÖĞRENCİ LİSTESİ GÜNCELLEME ===\n');

  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Dosya bulunamadı: ${DB_PATH}`);
  }

  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  const db = JSON.parse(raw);

  const prevStudents = db.students || [];
  const otherStudents = prevStudents.filter(s => {
    const inst = (s.institution_id || s.institutionId || '').trim().toLowerCase();
    return inst !== 'bolu-kilicaslan';
  });

  const removedCount = prevStudents.length - otherStudents.length;
  console.log(`Eski Bolu Kılıçarslan öğrencileri kaldırıldı: ${removedCount} öğrenci`);

  const now = new Date().toISOString();
  const newBoluStudents = RAW_STUDENTS.map((st, idx) => {
    const id = `student-kilicaslan-new-${Date.now()}-${idx + 1}`;
    return {
      id,
      name: st.name,
      surname: st.surname,
      class: '', // Sınıf belirtilmeden
      parent_phone: '',
      institution_id: 'bolu-kilicaslan',
      institutionId: 'bolu-kilicaslan',
      created_at: now,
      checkout_time: null,
      last_report_date: null,
      status: 'Rapor Yok',
      report_count: 0
    };
  });

  console.log(`Yeni eklenecek öğrenci sayısı: ${newBoluStudents.length}`);

  db.students = [...otherStudents, ...newBoluStudents];
  db.deleted_students = []; // Temizle

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  console.log(`✓ reports_db.json başarıyla güncellendi! Toplam öğrenci sayısı: ${db.students.length}`);

  // Firestore kontrolü
  try {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';
    const listUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/students?key=${apiKey}&pageSize=300`;
    const res = await fetch(listUrl);
    if (res.ok) {
      const data = await res.json();
      const docs = (data.documents || []).filter(d => {
        const inst = (d.fields?.institution_id?.stringValue || '').trim().toLowerCase();
        return inst === 'bolu-kilicaslan';
      });
      if (docs.length > 0) {
        console.log(`Firestore'da bulunan ${docs.length} eski Bolu öğrencisi siliniyor...`);
        for (const doc of docs) {
          const delUrl = `https://firestore.googleapis.com/v1/${doc.name}?key=${apiKey}`;
          await fetch(delUrl, { method: 'DELETE' });
        }
        console.log('✓ Firestore eski Bolu öğrencileri temizlendi.');
      }
    }
  } catch (err) {
    console.warn('Firestore temizlik uyarısı:', err.message);
  }

  console.log('\n=== İŞLEM TAMAMLANDI ===');
}

main().catch(console.error);
