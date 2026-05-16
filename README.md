# Isi Dompet - Aplikasi Manajemen Keuangan Pribadi

![Screenshot Aplikasi Isi Dompet](assets/screenshot.png)

**Isi Dompet** adalah aplikasi web manajemen keuangan pribadi (Personal Finance Management) yang modern, komprehensif, dan cerdas. Dibangun sepenuhnya di atas platform Google Apps Script dengan Google Sheets sebagai databasenya, aplikasi ini menawarkan solusi lengkap untuk melacak pemasukan, pengeluaran, investasi, hingga mendapatkan wawasan dari asisten AI.

---

## ✨ Fitur Utama

*   **Dashboard Interaktif**: Ringkasan kondisi finansial secara *real-time*, termasuk dana tersedia, total pengeluaran, dana terencana, dan total investasi.
*   **Visualisasi Data**: Grafik donat untuk *cashflow* bulanan dan grafik garis untuk tren transaksi 7 hari terakhir.
*   **Pencatatan Transaksi**: Fitur input yang mudah untuk mencatat **Pemasukan**, **Pengeluaran**, dan **Transfer** antar akun.
*   **Manajemen Master Data (CRUD)**: Kelola semua aset dan liabilitas Anda di satu tempat:
    *   🏦 **Bank**: Rekening bank.
    *   📱 **E-Wallet**: Dompet digital.
    *   💵 **Tunai**: Uang fisik.
    *   💎 **Investasi**: Aset investasi (saham, reksa dana, dll).
    *   🐷 **Tabungan**: Dana simpanan.
    *   🧾 **Hutang & Piutang**: Lacak dan kelola pembayaran hutang/piutang.
    *   📅 **Rencana**: Alokasikan budget untuk kebutuhan mendatang.
*   **Histori & Laporan Lengkap**:
    *   Tabel histori transaksi dengan fitur pencarian dan filter (tanggal, tipe).
    *   Grafik tren transaksi bulanan.
    *   Grafik perbandingan pengeluaran per kategori.
    *   Grafik penggunaan sumber dana.
*   **🤖 Asisten Keuangan AI**:
    *   Didukung oleh model AI **LLaMA 3.3 via Groq API** yang super cepat.
    *   Tanya apa saja tentang data keuangan Anda dan dapatkan jawaban serta saran yang relevan.
*   **Dukungan Multi-Bahasa & Multi-Mata Uang**:
    *   Tersedia dalam Bahasa Indonesia, Inggris, dan Melayu.
    *   Konversi nominal ke IDR, USD, MYR, dan SGD.
*   **Kurs Live**: Menampilkan kurs mata uang dan harga emas secara *real-time*.
*   **UI Modern & Responsif**:
    *   Desain antarmuka yang bersih dan modern menggunakan Tailwind CSS.
    *   Mode Terang (Light) dan Gelap (Dark).
    *   Fitur "Sensor Saldo" untuk privasi.
    *   Dapat diakses dengan baik di desktop maupun perangkat mobile.

---

## 🛠️ Teknologi yang Digunakan

*   **Backend**: **Google Apps Script**
*   **Database**: **Google Sheets**
*   **Frontend**: HTML, JavaScript (ES6+), Tailwind CSS
*   **Library**:
    *   [Chart.js](https://www.chartjs.org/) untuk visualisasi data.
    *   [SweetAlert2](https://sweetalert2.github.io/) untuk notifikasi dan dialog.
    *   [Font Awesome](https://fontawesome.com/) untuk ikon.
*   **API Eksternal**:
    *   [Groq API](https://groq.com/) untuk layanan AI Chat.
    *   [Currency API](https://github.com/fawazahmed0/currency-api) untuk data kurs mata uang.

---

## 🚀 Panduan Instalasi

Untuk menjalankan aplikasi ini di akun Google Anda, ikuti langkah-langkah berikut:

1.  **Buat Google Sheet Baru**:
    *   Buka [sheets.new](https://sheets.new) di browser Anda.
    *   Beri nama spreadsheet, misalnya "Database Isi Dompet".

2.  **Buka Editor Apps Script**:
    *   Dari menu Google Sheet, klik `Extensions` > `Apps Script`.

3.  **Salin Kode Backend**:
    *   Salin seluruh konten dari file `Code.js` dan tempelkan ke dalam file `Code.gs` di editor Apps Script.

4.  **Buat File Frontend**:
    *   Di editor Apps Script, klik ikon `+` > `HTML` untuk membuat file-file berikut. Salin-tempel konten yang sesuai ke dalamnya:
        *   `index.html`
        *   `view_dashboard.html`
        *   `view_transaksi.html`
        *   `view_input.html`
        *   `view_history.html`
        *   `view_profile.html`
    *   Klik ikon `+` > `Script` untuk membuat file JavaScript:
        *   `app.js` (Pastikan nama file diakhiri dengan `.js`)

5.  **Konfigurasi API Key**:
    *   Di dalam file `Code.gs`, cari baris `const GROQ_API_KEY = "YOUR_API_KEY";`.
    *   Ganti `"YOUR_API_KEY"` dengan API Key yang Anda dapatkan dari GroqCloud.

6.  **Siapkan Sheet di Database**:
    *   Kembali ke Google Sheet Anda. Buat sheet-sheet baru dengan nama dan kolom persis seperti di bawah ini:
        *   `user`: `ID`, `Username`, `Password`, `Last Update`
        *   `bank`: `ID`, `Nama`, `Saldo`, `Last Update`
        *   `ewallet`: `ID`, `Nama`, `Saldo`, `Last Update`
        *   `tunai`: `ID`, `Nama`, `Saldo`, `Last Update`
        *   `investasi`: `ID`, `Nama`, `Kategori`, `Nilai`, `Last Update`
        *   `tabungan`: `ID`, `Saldo`, `Deskripsi`, `Last Update`
        *   `rencana`: `ID`, `Nama`, `Kategori`, `Budget`, `Last Update`
        *   `hutang`: `ID`, `Kategori`, `Keterangan`, `Sumber`, `Saldo Awal`, `Sisa`, `Status`, `Last Update`
        *   `transaksi`: `ID`, `Kode`, `Kategori`, `Keterangan`, `Sumber`, `Nominal`, `Saldo Awal`, `Saldo Akhir`, `Tanggal`
        *   `history`: `Tipe`, `Kategori`, `Deskripsi`, `Sumber`, `Nominal`, `Saldo Awal`, `Saldo Akhir`, `Tanggal`

7.  **Deploy sebagai Web App**:
    *   Di editor Apps Script, klik tombol `Deploy` > `New deployment`.
    *   Pilih tipe `Web app`.
    *   Pada bagian `Execute as`, pilih **Me**.
    *   Pada bagian `Who has access`, pilih **Anyone with Google account** atau **Anyone** (jika ingin bisa diakses publik).
    *   Klik `Deploy`.
    *   **Penting**: Google akan meminta otorisasi. Klik `Authorize access`, pilih akun Google Anda, klik `Advanced`, lalu `Go to (unsafe)`. Izinkan semua permission yang diminta.
    *   Setelah selesai, salin URL Web App yang diberikan. Itulah alamat aplikasi Anda.

---

## 📂 Struktur File Proyek

```
eclasp/isidompet/
├── Code.js               # Logika backend (Google Apps Script)
├── app.js                # Logika frontend (JavaScript)
├── index.html            # File HTML utama (kerangka aplikasi)
├── view_dashboard.html   # Tampilan halaman Dashboard
├── view_transaksi.html   # Tampilan halaman Input Transaksi
├── view_input.html       # Tampilan halaman Master Data
├── view_history.html     # Tampilan halaman History & Laporan
├── view_profile.html     # Tampilan halaman Profil
├── assets/
│   └── screenshot.png    # Gambar screenshot aplikasi
└── README.md             # File ini
```

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT.

---

Dibuat dengan ❤️ untuk manajemen keuangan yang lebih baik.