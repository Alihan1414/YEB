# Öğrenci Günlük Rapor Sistemi (Student Daily Report System)

Bu proje, öğretmenlerin öğrencilerin günlük durumlarını (akademik, yemek, sağlık, davranış vb.) hızlı ve pratik bir şekilde raporlayabilmesi amacıyla geliştirilmiş, yapay zekâ destekli, mobil uyumlu modern bir Next.js web uygulamasıdır.

## 🌟 Özellikler

- **🎙️ Yapay Zekâ Sesli Rapor Girişi:** Google Gemini entegrasyonu sayesinde, mikrofona doğal dilde konuşarak (örn: *"Furkan Karakoç bugün öğle yemeğine gelmedi, rapora gir."*) rapor girişi yapabilirsiniz. Sistem öğrenciyi, kategoriyi ve içeriği otomatik algılar.
- **📱 %100 Duyarlı (Responsive) Tasarım:** iOS, Android, tablet ve masaüstü tarayıcılarının tamamında ekran boyutlarına tam uyum sağlar. Dokunmatik ekranlar için optimize edilmiştir.
- **📊 Özet Rapor Sayfası:** Raporların kategorilerine, günlere ve sınıflara göre dağılımını gösteren pasta ve çubuk grafikler (Recharts tabanlı).
- **🔒 Güvenli Kimlik Doğrulama (Auth):** Firebase Authentication altyapısı ile öğretmen ve yönetici yetkilendirmesi.
- **📂 CSV Toplu İçe Aktarım:** Sınıf listelerini toplu olarak tek tıkla sisteme aktarma imkanı.
- **✉️ Veli E-posta Bildirimleri:** Kritik raporlarda (sağlık, devamsızlık vb.) velilere otomatik bilgilendirme e-postası gönderimi (Resend API entegrasyonu).

---

## 🛠️ Kurulum ve Çalıştırma

### 1. Depoyu Klonlayın
```bash
git clone <github-repo-url>
cd student_reports
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Ortam Değişkenlerini Ayarlayın
Projenin kök dizininde `.env.local` dosyası oluşturun ve aşağıdaki değişkenleri kendi anahtarlarınızla doldurun (şablon için `.env.example` dosyasına göz atabilirsiniz):

```env
GEMINI_API_KEY=your_gemini_api_key

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

# Resend (Opsiyonel - Veli E-posta Bildirimleri İçin)
RESEND_API_KEY=your_resend_api_key
```

### 4. Geliştirme Sunucusunu Başlatın
```bash
npm run dev
```
Uygulamaya tarayıcınızdan `http://localhost:3000` adresinden erişebilirsiniz.

### 5. Production Derlemesi
```bash
npm run build
npm run start
```

---

## 📁 Dosya Yapısı

- `src/app/page.js`: Ana kontrol paneli (Ses tanıma, öğrenci listesi ve detay çekmecesi).
- `src/app/login/page.js`: Giriş ekranı.
- `src/app/admin/page.js`: Öğretmen ekleme ve rol yönetim paneli (Yalnızca Admin yetkisine sahip kullanıcılar erişebilir).
- `src/app/summary/page.js`: Grafikli özet istatistik ekranı.
- `src/app/api/`: Gemini AI entegrasyonu ve veli bilgilendirme e-posta servisi için API uç noktaları.
- `src/lib/`: Firebase istemci yapılandırması ve kullanıcı yetkilendirme bağlamı (`AuthContext`).

---

## 📱 Mobil ve Çapraz Cihaz Uyumluluğu

- **iOS & Android Desteği:** Tailwind v4 responsive grid sistemi ve flexbox yapıları kullanılarak tüm mobil cihazlarla tam uyumlu hale getirilmiştir.
- **Dokunmatik Hedefler:** Mobil tarayıcılarda rahat tıklama sağlamak için tüm butonlar ve form alanları dokunmatik ekran standartlarına uygun boyutlandırılmıştır.
- **Ses Tanıma:** Mobil cihazlardaki modern tarayıcılarda (Safari, Chrome) sesli komut altyapısı kesintisiz çalışır.
