const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../src/data/reports_db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

const backupStudents = [
  {
    "id": "student-1784779617892",
    "name": "Alihan",
    "surname": "Divanlı",
    "class": "10-A",
    "parent_email": "alihandivanli8@gmail.com",
    "parent_phone": "5415208414",
    "institution_id": "yamanevler",
    "created_at": "2026-07-23T04:06:57.892Z"
  },
  {
    "id": "student-1784780460669",
    "name": "Yusuf Taha",
    "surname": "Ergön",
    "class": "10-A",
    "parent_email": "",
    "parent_phone": "",
    "institution_id": "yamanevler",
    "created_at": "2026-07-23T04:21:00.669Z"
  },
  {
    "id": "student-1785128176836",
    "name": "Yunus Selim",
    "surname": "Diken",
    "class": "10-A",
    "parent_phone": "",
    "institution_id": "yamanevler",
    "created_at": "2026-07-27T04:56:16.836Z"
  },
  {
    "id": "student-1785128217972",
    "name": "Furkan",
    "surname": "Karakoç",
    "class": "10-A",
    "parent_phone": "5411886842",
    "institution_id": "yamanevler",
    "created_at": "2026-07-27T04:56:57.972Z"
  },
  {
    "id": "student-1786136406078-417",
    "name": "Ahmet Eymen",
    "surname": "Derindere",
    "class": "10-A",
    "parent_phone": "",
    "institution_id": "yamanevler",
    "created_at": "2026-08-07T21:00:06.078Z"
  }
];

backupStudents.forEach(bs => {
  if (!db.students.some(s => s.id === bs.id)) {
    db.students.push(bs);
  }
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
console.log('Eski ogrenciler yuklendi! Toplam ogrenci:', db.students.length);
