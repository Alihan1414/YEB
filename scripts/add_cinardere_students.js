/**
 * add_cinardere_students.js
 * Çınardere Erenler kurumunun öğrencilerini ekler
 * Kullanım: node scripts/add_cinardere_students.js
 */

const fs   = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../src/data/reports_db.json');
const db     = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

const INSTITUTION_ID = 'cinardere-erenler';

const yeniOgrenciler = [
  // ── 9/A ──────────────────────────────────────────────
  { name: 'Abdulkerim',    surname: 'Elfakir',           class: '9/A',  parent_phone: '5368195676' },
  { name: 'Beycan Şükrü', surname: 'Karbeyaz',          class: '9/A',  parent_phone: '5519993681' },
  { name: 'İshak',        surname: 'Kaplan',            class: '9/A',  parent_phone: '5422783464' },
  { name: 'Kenan',        surname: 'Nail',              class: '9/A',  parent_phone: '5433076219' },
  { name: 'Mithat',       surname: 'Örs',               class: '9/A',  parent_phone: '5386153225' },
  { name: 'Muhammet Emin',surname: 'İpek',              class: '9/A',  parent_phone: '5415383917' },
  { name: 'Mustafa',      surname: 'Alpsoy',            class: '9/A',  parent_phone: '5077105013' },
  { name: 'Veysel Karani',surname: 'Ay',                class: '9/A',  parent_phone: '5316875582' },
  { name: 'Yakup',        surname: 'Çiftçi',            class: '9/A',  parent_phone: '5350592650' },

  // ── 10/A ─────────────────────────────────────────────
  { name: 'Ayaz',          surname: 'Erol',             class: '10/A', parent_phone: '' },
  { name: 'Alperen',       surname: 'Yıldırım',         class: '10/A', parent_phone: '' },
  { name: 'Burak',         surname: 'Aksu',             class: '10/A', parent_phone: '' },
  { name: 'Burak',         surname: 'Demircioğlu',      class: '10/A', parent_phone: '' },
  { name: 'Can Ali Ramazan',surname:'Kahraman',         class: '10/A', parent_phone: '' },
  { name: 'Mehmet',        surname: 'Mazı',             class: '10/A', parent_phone: '' },
  { name: 'Muhammet Ali',  surname: 'Torun',            class: '10/A', parent_phone: '' },
  { name: 'Mustafa Emir',  surname: 'Aktürk',           class: '10/A', parent_phone: '' },
  { name: 'Rasul',         surname: 'Duruk',            class: '10/A', parent_phone: '' },
  { name: 'Seyyit Aras',   surname: 'Günay',            class: '10/A', parent_phone: '' },
  { name: 'Siraç',         surname: 'Bilgin',           class: '10/A', parent_phone: '' },
  { name: 'Talha',         surname: 'Kürekçi',          class: '10/A', parent_phone: '' },

  // ── 11/A ─────────────────────────────────────────────
  { name: 'Abdussamet',    surname: 'Gündoğdu',         class: '11/A', parent_phone: '5369583957' },
  { name: 'Ahmet Kemal',   surname: 'Özdemir',          class: '11/A', parent_phone: '5054405690' },
  { name: 'Eyüp',          surname: 'Karakaya',         class: '11/A', parent_phone: '5353667681' },
  { name: 'Hakan',         surname: 'Antep',            class: '11/A', parent_phone: '5449638083' },
  { name: 'Mehmet Akif',   surname: 'Özenç',            class: '11/A', parent_phone: '5366881442' },
  { name: 'Muhammet Taha', surname: 'İkiz',             class: '11/A', parent_phone: '5062914824' },

  // ── 12/A ─────────────────────────────────────────────
  { name: 'Abdurrahman',   surname: 'İkiz',             class: '12/A', parent_phone: '5469437557' },
  { name: 'Ahmet',         surname: 'Abdurrahimoğlu',   class: '12/A', parent_phone: '5528127731' },
  { name: 'Ahmet Talha',   surname: 'Uçan',             class: '12/A', parent_phone: '5364616385' },
  { name: 'Ahmet Talha',   surname: 'Yücel',            class: '12/A', parent_phone: '5322661918' },
  { name: 'Ahmet Siraç',   surname: 'Günçavdı',         class: '12/A', parent_phone: '5363090975' },
  { name: 'Bilal',         surname: 'Çetin',            class: '12/A', parent_phone: '5442768923' },
  { name: 'Mehmet İhsan',  surname: 'Yılmaz',           class: '12/A', parent_phone: '5542177962' },
  { name: 'Muhammed Emin', surname: 'Kaya',             class: '12/A', parent_phone: '' },
];

let eklenen  = 0;
let atlanan  = 0;

yeniOgrenciler.forEach((o, i) => {
  const id = `student-cinardere-${Date.now()}-${i}`;

  // Aynı ad+soyad+sınıf+kurum varsa ekleme
  const mevcutMu = db.students.some(
    s => s.name === o.name && s.surname === o.surname &&
         s.class === o.class && s.institution_id === INSTITUTION_ID
  );

  if (mevcutMu) {
    console.log(`⏭️  Zaten var: ${o.name} ${o.surname} (${o.class})`);
    atlanan++;
    return;
  }

  db.students.push({
    id,
    name:           o.name,
    surname:        o.surname,
    class:          o.class,
    parent_email:   '',
    parent_phone:   o.parent_phone,
    institution_id: INSTITUTION_ID,
    created_at:     new Date().toISOString(),
  });

  console.log(`✅ Eklendi: ${o.name} ${o.surname} (${o.class})`);
  eklenen++;
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
console.log(`\n📊 Sonuç: ${eklenen} eklendi, ${atlanan} atlandı`);
console.log(`📚 Toplam öğrenci sayısı: ${db.students.length}`);
