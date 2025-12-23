# Sistem Penilaian Kinerja Karyawan

Web aplikasi untuk penilaian kinerja karyawan berbasis **AdminKit** (Bootstrap 5) dan **Node.js Express** + **MySQL**.

## 📋 Prasyarat
Pastikan Anda sudah menginstall:
1.  **Node.js** (https://nodejs.org/)
2.  **MySQL Database** (Bisa pakai Laragon atau XAMPP)

## 🚀 Cara Menjalankan

### 1. Setup Database
1.  Buka phpMyAdmin atau MySQL Client.
2.  Buat database baru bernama **`db_sistem_penilaian_kinerja`**.
3.  Import file **`seed.sql`** yang ada di folder project ini ke dalam database tersebut.

### 2. Install Dependencies
Buka terminal di folder project, lalu jalankan:
```bash
npm install
```

### 3. Jalankan Aplikasi
Anda perlu membuka **2 Terminal** berbeda untuk menjalankan Backend dan Frontend secara bersamaan.

**Terminal 1 (Backend Server):**
```bash
node server.js
```
*Server API akan berjalan di:* `http://localhost:3000`

**Terminal 2 (Frontend):**
```bash
npm start
```
*Web akan terbuka otomatis di:* `http://localhost:8080`

## 🔑 Akun Login

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@gmail.com` | `admin123` |
| **Karyawan** | `karyawan@gmail.com` | `karyawan123` |

---
*Note: Password user baru akan otomatis dienkripsi.*
