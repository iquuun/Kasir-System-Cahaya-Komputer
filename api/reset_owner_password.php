<?php

// Load Laravel Bootstrap
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

echo "========================================\n";
echo "      RESET PASSWORD OWNER KASIR        \n";
echo "========================================\n\n";

// Find the owner user
$owner = User::where('role', 'owner')->first();

if (!$owner) {
    echo "User Owner tidak ditemukan. Membuat user Owner baru...\n";
    $owner = User::create([
        'name' => 'Owner Cahaya',
        'email' => 'owner@cahaya.id',
        'password' => Hash::make('password123'),
        'role' => 'owner',
    ]);
} else {
    echo "User Owner Terdeteksi:\n";
    echo "Nama  : " . $owner->name . "\n";
    echo "Email : " . $owner->email . "\n\n";
    
    echo "Apakah Anda ingin me-reset email / password akun ini? (y/n): ";
    $line = fgets(STDIN);
    if (trim(strtolower($line)) !== 'y') {
        echo "Proses dibatalkan.\n";
        exit(0);
    }
}

// Ask for new email
echo "Masukkan email baru (tekan ENTER jika tetap '" . $owner->email . "'): ";
$newEmail = trim(fgets(STDIN));
if ($newEmail !== '') {
    // Check if email already used by other user
    $exists = User::where('email', $newEmail)->where('id', '!=', $owner->id)->exists();
    if ($exists) {
        echo "[ERROR] Email '$newEmail' sudah digunakan oleh pengguna lain.\n";
        exit(1);
    }
    $owner->email = $newEmail;
}

// Ask for new password
echo "Masukkan password baru (tekan ENTER jika ingin direset ke 'password123'): ";
$newPassword = trim(fgets(STDIN));
if ($newPassword === '') {
    $newPassword = 'password123';
}

$owner->password = Hash::make($newPassword);
$owner->save();

echo "\n========================================\n";
echo "SUKSES! Akun Owner berhasil diperbarui.\n";
echo "Email         : " . $owner->email . "\n";
echo "Password Baru : " . $newPassword . "\n";
echo "========================================\n";
