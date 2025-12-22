-- Seeding Data untuk db_sistem_penilaian_kinerja

-- 1. Insert Data Roles
INSERT INTO `roles` (`role_id`, `role_name`) VALUES
(1, 'Admin'),
(2, 'Karyawan');

-- 2. Insert Data Users (Contoh)
-- Password 'admin123' dan '123456' diasumsikan sudah di-hash jika backend menggunakan hashing (misal MD5/Bcrypt). 
-- Disini kita masukkan plain text untuk contoh atau hash dummy.
INSERT INTO `users` (`user_id`, `username`, `password`, `email`, `role_id`) VALUES
(1, 'Admin System', 'admin123', 'admin@gmail.com', 1),
(2, 'Budi Santoso', '123456', 'budi@test.com', 2),
(3, 'Siti Aminah', '123456', 'siti@test.com', 2);

-- 3. Insert Data Kriteria (Sesuai Dashboard)
INSERT INTO `kriteria` (`kriteria_id`, `nama_kriteria`, `bobot`) VALUES
(1, 'Disiplin', 20),
(2, 'Tanggung Jawab', 25),
(3, 'Kerjasama Tim', 15),
(4, 'Inisiatif', 15),
(5, 'Kualitas Kerja', 25);

-- 4. Insert Data Periode
INSERT INTO `periode` (`periode_id`, `nama_periode`, `status`) VALUES
(1, 'Q4 2024', 'Closed'),
(2, 'Q1 2025', 'Active');
