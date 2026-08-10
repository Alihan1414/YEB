/**
 * add_kilicaslan_students.js
 * Bolu Kılıçaslan kurumunun öğrencilerini ekler
 * Kullanım: node scripts/add_kilicaslan_students.js
 */

const fs   = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../src/data/reports_db.json');
const db     = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

const INSTITUTION_ID = 'bolu-kilicaslan';

// Telefon numarasını temizle (boşlukları kaldır)
function cleanPhone(raw) {
  return raw.replace(/\s+/g, '').trim();
}

const yeniOgrenciler = [
  { name: 'Hüseyin Hilmi',          surname: 'Ataseven',           class: '11', parent_phone: cleanPhone('0544 7895855') },
  { name: 'Ahmet Faruk',            surname: 'Ağır',               class: '11', parent_phone: cleanPhone('0532 6585080') },
  { name: 'Ahmet Arif',             surname: 'Olğun',              class: '11', parent_phone: cleanPhone('0532 4917792') },
  { name: 'Kerem',                  surname: 'Kabak',              class: '11', parent_phone: cleanPhone('0535 6414674') },
  { name: 'Hanefi Enes',            surname: 'Kılıç',              class: '11', parent_phone: cleanPhone('0546 8991331') },
  { name: 'Haşim',                  surname: 'Öngür',              class: '11', parent_phone: cleanPhone('0535 7997716') },
  { name: 'Yunus Emre',             surname: 'Erdoğan',            class: '11', parent_phone: cleanPhone('0530 6811802') },
  { name: 'Oruç',                   surname: 'Sandıkçı',           class: '11', parent_phone: cleanPhone('0535 3421098') },
  { name: 'Alim Yusuf',             surname: 'Çatak',              class: '11', parent_phone: cleanPhone('0557 2526865') },
  { name: 'Ahmet Furkan',           surname: 'Gülçiçek',           class: '11', parent_phone: cleanPhone('0533 8163767') },
  { name: 'Mustafa',                surname: 'Doğan',              class: '11', parent_phone: cleanPhone('0535 5596697') },
  { name: 'Hüseyin Hilmi',          surname: 'Öztemür',            class: '11', parent_phone: cleanPhone('0533 6691199') },
  { name: 'Tunahan',                surname: 'Kurt',               class: '11', parent_phone: cleanPhone('0536 4513215') },
  { name: 'Umut',                   surname: 'Karatepe',           class: '11', parent_phone: cleanPhone('0538 4123584') },
  { name: 'Mücahit Mert',           surname: 'Demirözü',           class: '11', parent_phone: cleanPhone('0555 9694688') },
  { name: 'Emir Salih',             surname: 'Gümrük',             class: '11', parent_phone: cleanPhone('0536 6579118') },
  { name: 'Hasan Furkan',           surname: 'Orhan',              class: '11', parent_phone: cleanPhone('0533 6980092') },
  { name: 'Mehmet Hayati',          surname: 'Fidan',              class: '11', parent_phone: cleanPhone('0537 7459881') },
  { name: 'Selman',                 surname: 'Tosun',              class: '11', parent_phone: cleanPhone('0545 6764158') },
  { name: 'Hilmi Sevban',           surname: 'Sarıyar',            class: '11', parent_phone: cleanPhone('0538 7283085') },
  { name: 'Ömer Faruk',             surname: 'Demirci',            class: '11', parent_phone: cleanPhone('0507 9962120') },
  { name: 'Yusuf',                  surname: 'Karabey',            class: '11', parent_phone: cleanPhone('0532 5828147') },
  { name: 'İlker Baki',             surname: 'Yıldırım',           class: '11', parent_phone: cleanPhone('0532 5787919') },
  { name: 'Sapuruddin',             surname: 'Şah',                class: '11', parent_phone: cleanPhone('0531 4943662') },
  { name: 'Abba Ali',               surname: 'Abdelkadre',         class: '11', parent_phone: cleanPhone('0662 82425') },
  { name: 'Mahad Abdirashid',       surname: 'Farah',              class: '11', parent_phone: cleanPhone('0616 098126') },
  { name: 'Emre',                   surname: 'Şimşek',             class: '11', parent_phone: cleanPhone('0533 3492990') },
  { name: 'Abdullah',               surname: 'Kurnaz',             class: '11', parent_phone: cleanPhone('0539 3542483') },
  { name: 'Taner',                  surname: 'Çelik',              class: '11', parent_phone: cleanPhone('0532 7915524') },
  { name: 'Nurali',                 surname: 'Bakhatkhan',         class: '11', parent_phone: cleanPhone('0506 7720078') },
  { name: 'Ibrahime',               surname: 'Sarba',              class: '11', parent_phone: cleanPhone('0234 256324') },
  { name: 'Hakam Abdullah',         surname: 'Fatih',              class: '11', parent_phone: cleanPhone('0245 1233234') },
  { name: 'Ziyaahdin',              surname: 'Artış',              class: '11', parent_phone: cleanPhone('0507 4608310') },
  { name: 'Ahmet',                  surname: 'Koçer',              class: '11', parent_phone: cleanPhone('0553 4335585') },
  { name: 'Kemal',                  surname: 'Nurbayev',           class: '11', parent_phone: cleanPhone('0552 0717293') },
  { name: 'Rahmat',                 surname: 'Fauzan',             class: '11', parent_phone: cleanPhone('0533 343435353') },
  { name: 'Muhammad Fakhri',        surname: 'Akbar',              class: '11', parent_phone: cleanPhone('0533 5373902648') },
  { name: 'Muhammad Abdu Romy',     surname: 'Al Aziza',           class: '11', parent_phone: cleanPhone('0912 45698751') },
  { name: 'Nabil Ikhsan',           surname: 'Eljibal',            class: '11', parent_phone: cleanPhone('0812 27569739') },
  { name: 'Fathan Athallah',        surname: 'Andria',             class: '11', parent_phone: cleanPhone('0821 22661718') },
  { name: 'Hassan',                 surname: 'Wamanga',            class: '11', parent_phone: cleanPhone('0726 667562') },
  { name: 'Fakhru Rais Dzarari',    surname: 'Malay',              class: '11', parent_phone: cleanPhone('0507 5883202') },
  { name: 'Prima Wijaya',           surname: 'Mahendra Putra',     class: '11', parent_phone: cleanPhone('0554 1352114') },
  { name: 'İsmail',                 surname: 'Üstün',              class: '11', parent_phone: cleanPhone('0532 4026101') },
  { name: 'Ali',                    surname: 'Kaymakcıoğlu',       class: '11', parent_phone: cleanPhone('0537 3757245') },
  { name: 'İbrahim',                surname: 'Kenar',              class: '11', parent_phone: cleanPhone('0544 5681913') },
  { name: 'Muhammet Ali',           surname: 'Baskın',             class: '11', parent_phone: cleanPhone('0536 8667512') },
  { name: 'Mehmet Talha',           surname: 'Barazama',           class: '11', parent_phone: cleanPhone('0532 7101591') },
  { name: 'Emirhan',                surname: 'Sarı',               class: '11', parent_phone: cleanPhone('0537 4014048') },
  { name: 'İsmail Can',             surname: 'Tunalı',             class: '11', parent_phone: cleanPhone('0536 6184390') },
  { name: 'Yavuz Selim',            surname: 'Yener',              class: '11', parent_phone: cleanPhone('0505 5677134') },
  { name: 'Hamza',                  surname: 'Akbel',              class: '11', parent_phone: cleanPhone('0532 0698073') },
  { name: 'Nazif Can',              surname: 'Çoşgun',             class: '11', parent_phone: cleanPhone('0535 7800642') },
  { name: 'Mehmet Emin',            surname: 'Çelik',              class: '11', parent_phone: cleanPhone('0505 7755525') },
  { name: 'Mehmet Ali',             surname: 'Kavuştur',           class: '11', parent_phone: cleanPhone('0530 7807942') },
  { name: 'Süleyman Fatih',         surname: 'Tekin',              class: '11', parent_phone: cleanPhone('0535 5695684') },
  { name: 'Mehmet Tunahan',         surname: 'Aktaş',              class: '11', parent_phone: cleanPhone('0532 3264262') },
  { name: 'Ahmet Kemal',            surname: 'Kocakuzgun',         class: '11', parent_phone: cleanPhone('0536 4637555') },
  { name: 'Recep',                  surname: 'Yılmaz',             class: '11', parent_phone: cleanPhone('0537 6422111') },
  { name: 'Muhammad',               surname: 'Abubakar',           class: '11', parent_phone: cleanPhone('0332 7786821') },
  { name: 'Hensarmu Aman',          surname: 'Gemechu',            class: '11', parent_phone: cleanPhone('091 3965247') },
  { name: 'Mansour',                surname: 'Etminan',            class: '11', parent_phone: cleanPhone('0456 387541') },
  { name: 'Abshir',                 surname: 'Ahmed Osman',        class: '11', parent_phone: cleanPhone('0618 426219') },
  { name: 'Ahmat Zakaria',          surname: 'Ahaya',              class: '11', parent_phone: cleanPhone('0667 56245') },
  { name: 'Abdirashid Ibrahim',     surname: 'Hassan',             class: '11', parent_phone: cleanPhone('0453 764158') },
  { name: 'Mehmet Arif',            surname: 'Çalışkan',           class: '11', parent_phone: cleanPhone('0536 8706599') },
  { name: 'Ridvan Emir',            surname: 'Koşar',              class: '11', parent_phone: cleanPhone('0505 4554992') },
  { name: 'Eyüp Ensar',             surname: 'Belen',              class: '11', parent_phone: cleanPhone('0542 2762495') },
  { name: 'Muhamad Ihsan Abdul Azis',surname:'Malik',              class: '11', parent_phone: cleanPhone('0857 11691118') },
  { name: 'Muhammad Atif',          surname: 'Al Farisi',          class: '11', parent_phone: cleanPhone('0456 789321') },
  { name: 'Mehmet Emin',            surname: 'İnce',               class: '11', parent_phone: cleanPhone('0505 8117793') },
  { name: 'Haroune',                surname: 'Ouedraga',           class: '11', parent_phone: cleanPhone('0546 1234567') },
  { name: 'Abdoul Aziz',            surname: 'Sawadogo',           class: '11', parent_phone: cleanPhone('0456 456321897') },
  { name: 'Khadar Ismail',          surname: 'Abokor',             class: '11', parent_phone: cleanPhone('063 4774504') },
  { name: 'Ismael',                 surname: 'Traore',             class: '11', parent_phone: cleanPhone('0057 01959') },
  { name: 'Mahmut Esad',            surname: 'Sayın',              class: '11', parent_phone: cleanPhone('0536 6567751') },
  { name: 'Ahmet',                  surname: 'Fidan',              class: '11', parent_phone: cleanPhone('0538 5643227') },
  { name: 'Ferhat',                 surname: 'Uyar',               class: '11', parent_phone: cleanPhone('0532 5176477') },
  { name: 'Ömer',                   surname: 'Aydın',              class: '11', parent_phone: cleanPhone('0505 0112973') },
  { name: 'Kenryu Hyde',            surname: 'Sirodjudin',         class: '11', parent_phone: cleanPhone('0913 5698745621') },
  { name: 'Ibrahim',                surname: 'Djibo',              class: '11', parent_phone: cleanPhone('0075 7592410') },
  { name: 'Hazrat',                 surname: 'Adigözeloğlu',       class: '11', parent_phone: cleanPhone('055 2027071') },
  { name: 'Ertuğrul',               surname: 'Uzunsel',            class: '11', parent_phone: cleanPhone('0542 3088623') },
  { name: 'Muhammad Rauza Hudzam',  surname: 'Almahi',             class: '11', parent_phone: cleanPhone('0819 98882903') },
  { name: 'Halil İbrahim',          surname: 'Sucu',               class: '11', parent_phone: cleanPhone('0538 3432770') },
  { name: 'Abdulkadir',             surname: 'Adlığ',              class: '11', parent_phone: cleanPhone('0507 0759405') },
  { name: 'Ahmad',                  surname: 'Naufal',             class: '11', parent_phone: cleanPhone('0554 1352114') },
  { name: 'Youssouf',               surname: 'Diakite',            class: '11', parent_phone: cleanPhone('0082 44503') },
  { name: 'Zidane',                 surname: 'Zaynussafa',         class: '11', parent_phone: cleanPhone('0813 11265995') },
  { name: 'Sayed Mohammad',         surname: 'Naqsh Bandi',        class: '11', parent_phone: cleanPhone('0787 586117') },
  { name: 'Faraz',                  surname: 'Jafari Kangarlouei', class: '11', parent_phone: cleanPhone('0507 4586724') },
  { name: 'İsmail',                 surname: 'Abbas',              class: '11', parent_phone: cleanPhone('0542 7689577') },
  { name: 'Ömer',                   surname: 'Abbas',              class: '11', parent_phone: cleanPhone('0541 7689577') },
];

let eklenen = 0;
let atlanan = 0;

yeniOgrenciler.forEach((o, i) => {
  const id = `student-kilicaslan-${Date.now()}-${i}`;

  const mevcutMu = db.students.some(
    s => s.name === o.name && s.surname === o.surname &&
         s.class === o.class && s.institution_id === INSTITUTION_ID
  );

  if (mevcutMu) {
    console.log(`⏭️  Zaten var: ${o.name} ${o.surname}`);
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

  console.log(`✅ Eklendi: ${o.name} ${o.surname}`);
  eklenen++;
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
console.log(`\n📊 Sonuç: ${eklenen} eklendi, ${atlanan} atlandı`);
console.log(`📚 Toplam öğrenci sayısı: ${db.students.length}`);
