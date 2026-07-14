# Enterprise Backend Template (Node.js + Express)

Template Backend *Production-Ready* berbasis Express.js yang kokoh dan aman. Ditenagai oleh **PostgreSQL (Sequelize)**, **Redis (Caching & Queue)**, dan **BullMQ** untuk pemrosesan latar belakang (*background jobs*).

Sistem ini telah melewati lebih dari 11 tahap audit keamanan dan arsitektur untuk menjamin ketahanan dari *Crash*, *Denial of Service (DoS)*, *SQL Injection*, serta celah logika otentikasi.

---

## 📂 Struktur Direktori (Foldering)

Arsitektur sistem dibangun dengan pendekatan modular:

```text
├── src/
│   ├── config/      # Pengaturan variabel environment (app, db, mail, redis)
│   ├── controller/  # Logika utama (Business Logic) untuk menangani Request/Response
│   ├── database/    # Inisialisasi DB, file Migrasi (Umzug), dan Seeder
│   ├── job/         # Definisi tugas spesifik untuk antrean (BullMQ)
│   ├── libs/        # Integrasi instance pihak ketiga (mis. koneksi Redis)
│   ├── middleware/  # Filter pencegat request (Auth, Error, RateLimit, Validator Joi)
│   ├── model/       # Definisi skema tabel PostgreSQL (Sequelize Models)
│   ├── monitoring/  # Dashboard monitoring (contoh: Bull Board untuk Antrean)
│   ├── queue/       # Inisialisasi antrean BullMQ (contoh: emailQueue)
│   ├── route/       # Peta rute (Endpoints/URL) yang mengarah ke Controller
│   ├── services/    # Layanan mandiri yang dipanggil dari Controller (Mailer, AuditLog)
│   ├── utils/       # Kumpulan fungsi pembantu (Helpers: Logger, Response, Pagination)
│   └── worker/      # Skrip latar belakang independen (Node.js Workers)
├── storage/         # Folder tempat menyimpan file upload lokal (mis: avatar)
└── .env             # Variabel rahasia (Environment)
```

---

## 🚀 Cara Menjalankan Proyek (Running)

### 1. Persiapan Environment
Salin file `.env.example` menjadi `.env` dan isi data yang dibutuhkan (seperti DB, Redis, dan JWT Secret).
```bash
cp .env.example .env
```

### 2. Nyalakan Database & Redis (Opsional: via Docker)
Jika Anda menggunakan Docker lokal, Anda bisa menyalakan service database & redis dengan:
*(Catatan: Konfigurasi Dockerfile app telah dihapus agar fokus pada pengembangan lokal)*
```bash
docker-compose up -d db redis
```

### 3. Instalasi Dependensi
```bash
npm install
```

### 4. Eksekusi Migrasi & Seeder Database
```bash
npm run db:migrate
npm run db:seed
```

### 5. Jalankan Server Utama (API)
Server akan berjalan dan secara otomatis mendeteksi perubahan file (*hot-reload*).
```bash
npm run dev
```

### 6. Jalankan Background Worker (Penting untuk Email)
Karena pengiriman email menggunakan antrean (BullMQ), jalankan perintah ini di tab terminal **terpisah**:
```bash
npm run worker-email
```

---

## 🗄️ Manajemen Database (Migration & Seeder)

Proyek ini menggunakan **Sequelize** dibantu dengan **Umzug** untuk sistem migrasi mandiri. File konfigurasi ada di `src/database/migrator.js`.

### Menjalankan Migrasi
Mengeksekusi semua file di dalam folder `src/database/migrations/` secara berurutan.
```bash
npm run db:migrate
```

### Mengurungkan (Rollback) Migrasi Terakhir
Jika terjadi kesalahan pada tabel, Anda bisa mundur satu langkah:
```bash
npm run db:migrate:undo
```

### Menjalankan Seeder
Seeder akan memasukkan data awal wajib (seperti hak akses (*Permissions*), *Roles*, dan akun Super Admin). Logika seeder ada di `src/database/seeder/seeder.js`.
```bash
npm run db:seed
```
*Catatan: Akun bawaan setelah seeder adalah `admin` / `admin123`.*

---

## 🛠️ Panduan Penggunaan Utils (Fungsi Bantuan)

Sistem telah menyediakan berbagai perkakas bawaan di folder `src/utils/` agar penulisan kode tetap bersih (*Clean Code*).

### 1. Logger (`src/utils/logger.js`)
Menggantikan `console.log`. Logger ini akan secara otomatis menyimpan jejak ke dalam folder `logs/` (berdasarkan hari) dan menyisipkan `RequestID`.

```javascript
import { createLogger } from "../utils/logger.js";
const logger = createLogger("NamaModuleAnda");

// Penggunaan
logger.info("Proses berhasil berjalan");
logger.warn("Ada data yang kosong");
logger.error("Terjadi kegagalan koneksi DB", { error: err });
```

### 2. Response (`src/utils/response.js`)
Gunakan utilitas ini untuk mengembalikan format JSON yang konsisten ke sisi Frontend.

```javascript
import { sendSuccess, sendError } from "../utils/response.js";

// Format Sukses: { meta: { code: 200, message: "OK" }, data: {...} }
return sendSuccess(res, { userId: 1 }, "Login Berhasil", 200);

// Format Error: { meta: { code: 500, message: "..." }, error: "..." }
return sendError(res, "Gagal menyimpan data", 500, errorData);
```

### 3. Pagination & Sorting (`src/utils/pagination.js`)
Secara ajaib mengubah parameter URL (`?page=2&limit=10&sortBy=name`) menjadi query Sequelize yang aman dari celah *SQL Injection*.

```javascript
import { getPaginationParams, paginate } from "../utils/pagination.js";
import { User } from "../model/index.js";

const getAllUsers = async (req, res) => {
  // Ambil data query dari URL
  const paginationParams = getPaginationParams(req.query);

  // Lempar ke fungsi paginate beserta Model dan konfigurasinya
  const { data, pagination } = await paginate(User, {
    ...paginationParams,
    where: { isBlocked: false },
  });

  return sendSuccess(res, data, "Data Users", 200, pagination);
};
```

### 4. Caching & Cache Invalidation (`src/utils/cache.js`)
Anda bisa menyisipkan middleware `cacheMiddleware(3600)` pada Route untuk melakukan *caching* (otomatis tersimpan di Redis). Namun, jika ada perubahan data (seperti admin mengedit Roles), Anda **wajib membersihkan cache lama**.

```javascript
import { clearCache } from "../utils/cache.js";

// Hapus semua data cache yang url-nya diawali "/api/roles"
await clearCache("cache:/api/roles*");
```

---

## 🛡️ Celah Keamanan yang Telah Ditambal (Security Context)
- **Header Overflow**: String raksasa di `User-Agent` akan otomatis dipotong (slice) agar tidak memecahkan kolom skema tabel *Audit Logs*.
- **Payload & Bcrypt DoS**: Batasan ukuran body JSON sebesar 1MB dan password 128 karakter untuk mencegah antrean komputasi CPU membeku (*Freeze*).
- **Admin UI Securty**: Dashboard Monitoring Antrean BullBoard (`/admin/queues`) kini secara mandiri dilindungi dengan *HTTP Basic Auth* bawaan browser.
- **Strict Case-Sensitivity**: Modul *Auth* kini kebal huruf kapital acak (Sistem akan secara otomatis melakukan *lowercase normalization* di belakang layar).
- **ESM Hoisting Crash Fix**: Memperbaiki urutan pembacaan variabel *environment* `.env` untuk mencegah Node.js berhenti (*crash*) saat inisialisasi awal.
