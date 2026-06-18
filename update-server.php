<?php
/**
 * Auto-Deploy Script "Kurir" (Pure PHP - No shell_exec)
 * 
 * Script ini digunakan untuk mensinkronisasi otomatis kode dari 
 * folder webhook (github-kurir) ke folder laravel yang sesungguhnya
 * yang berada di luar public_html menggunakan copy PHP murni (aman dari shell_exec disabled).
 */

// 1. Keamanan Sederhana: Harus menggunakan URL parameter ?key=rahasia123
if (!isset($_GET['key']) || $_GET['key'] !== 'rahasia123') {
    http_response_code(403);
    die('<h1>Akses Ditolak</h1>');
}

echo "<pre style='background:#1e1e1e; color:#0f0; padding:20px; border-radius:10px; font-family:monospace;'>";
echo "🚀 <b>MEMULAI SINKRONISASI BACKEND KE SERVER (PURE PHP)...</b>\n\n";

// Mengamankan seluruh folder github-kurir ini agar file .env dan lainnya tidak bisa di-download orang
$htaccess = "Deny from all\n<Files \"update-server.php\">\n    Allow from all\n</Files>";
file_put_contents(__DIR__ . '/.htaccess', $htaccess);
echo "[✔] Folder github-kurir berhasil dikunci dengan .htaccess (Aman!)\n\n";

// Path Dinamis: 
$home_dir = dirname(dirname(__DIR__));

// Lokasi Sumber: folder API dari GitHub (/home/uXXXX/public_html/github-kurir/api/)
$source = __DIR__ . '/api/';

// Lokasi Tujuan: folder laravel asli (/home/uXXXX/laravel/)
$target = $home_dir . '/laravel/';

echo "📁 Source : $source\n";
echo "📁 Target : $target\n\n";

if (!is_dir($target)) {
    die("❌ ERROR: Folder target ($target) tidak ditemukan! Pastikan nama foldernya 'laravel'.");
}

// Fungsi salin folder rekursif murni PHP
function custom_copy($src, $dst, $exclude = []) {
    if (!is_dir($src)) return;
    if (!is_dir($dst)) {
        @mkdir($dst, 0755, true);
    }
    $dir = opendir($src);
    while (false !== ($file = readdir($dir))) {
        if (($file !== '.') && ($file !== '..')) {
            if (in_array($file, $exclude)) {
                continue;
            }
            $srcFile = $src . '/' . $file;
            $dstFile = $dst . '/' . $file;
            if (is_dir($srcFile)) {
                custom_copy($srcFile, $dstFile, $exclude);
            } else {
                @copy($srcFile, $dstFile);
            }
        }
    }
    closedir($dir);
}

echo "⏳ <b>Menyalin File via PHP (Pengecualian .env, storage, vendor)...</b>\n";
try {
    custom_copy($source, $target, ['.env', 'storage', 'node_modules', 'vendor', 'database.sqlite', 'database_temp_backup.sqlite']);
    echo "[✔] Copy File Selesai!\n\n";
} catch (\Exception $e) {
    die("❌ ERROR saat menyalin file: " . $e->getMessage());
}

echo "⏳ <b>Menjalankan Migrasi & Clear Cache via Laravel Console...</b>\n";
try {
    if (file_exists($target . '/vendor/autoload.php') && file_exists($target . '/bootstrap/app.php')) {
        require $target . '/vendor/autoload.php';
        $app = require_once $target . '/bootstrap/app.php';
        $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
        $kernel->bootstrap();
        
        // Menjalankan Artisan commands melalui Application instance
        echo "Menjalankan php artisan migrate --force...\n";
        $exitCodeMigrate = \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        echo "Output Migrate:\n" . (\Illuminate\Support\Facades\Artisan::output() ?: "No output\n") . "\n";
        
        echo "Menjalankan php artisan optimize:clear...\n";
        $exitCodeOptimize = \Illuminate\Support\Facades\Artisan::call('optimize:clear');
        echo "Output Optimize:\n" . (\Illuminate\Support\Facades\Artisan::output() ?: "No output\n") . "\n";
        
        echo "✅ Laravel tasks completed successfully!\n";
    } else {
        echo "❌ Laravel vendor atau bootstrap files tidak ditemukan di target!\n";
    }
} catch (\Exception $e) {
    echo "❌ Error menjalankan Laravel tasks: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}

echo "\n✨ <b>PROSES DEPLOYMENT SELESAI DENGAN SUKSES!</b> ✨";
echo "</pre>";
?>
