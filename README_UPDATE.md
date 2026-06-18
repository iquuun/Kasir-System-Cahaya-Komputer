# Catatan Perubahan - 11 April 2026

Berikut adalah daftar perubahan dan fitur baru yang telah diimplementasikan:

### 1. Sistem Gaji Karyawan (Payroll)
- **Database**: Membuat tabel `employees` dan `employee_salaries`.
- **Backend**: `EmployeeController` & `EmployeeSalaryController` untuk manajemen staf non-user.
- **Integrasi Kas**: Setiap input gaji otomatis memotong saldo cash flow.
- **UI**: Tab baru "Gaji Karyawan" di halaman Cash Flow.

### 2. Verifikasi Penjualan (Fitur Ceklis)
- Menambahkan kolom **CEK** di paling kiri tabel Pembukuan Penjualan.
- Baris akan berubah warna menjadi **Biru Langit Tipis** jika sudah diceklis (terverifikasi).
- Status verifikasi tersimpan di database.

### 3. Konsolidasi Manajemen Stok
- Menggabungkan **Riwayat Pergerakan Barang** ke dalam halaman **Stok Opname** menggunakan sistem tab.
- Menghapus menu sidebar riwayat stok agar lebih ringkas dan teratur.

### 4. Optimasi Kalkulator Rakitan
- **Compact Layout**: Daftar komponen dibuat rapat dengan header tabel tunggal (menghemat ruang vertikal).
- **Admin Breakdown**: Sekarang menampilkan rincian nominal admin, promo xtra, ongkir xtra, dll secara langsung.
- **Top Config Bar**: Kotak aturan pemotongan marketplace dipindah ke atas dan dibuat membentang (full-width).

### 5. Optimasi Pengaturan Toko
- Mengubah layout daftar toko menjadi **Grid 2 Kolom** (Layar lebar menampilkan 2 toko berdampingan).
- Ukuran input dan kartu diperkecil agar tidak perlu scroll jauh.

### 6. Perbaikan Bug & UI
- Memperbaiki error **White Screen** pada halaman Stok Opname.
- Memperbaiki **Missing Imports** pada tab Mutasi Rekening dan Pembukuan.
- Penyesuaian warna UI agar lebih premium dan nyaman di mata.
