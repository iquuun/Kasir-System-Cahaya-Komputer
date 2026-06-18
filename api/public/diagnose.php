<?php
/**
 * Diagnostik Logo Upload - CahayaPOS
 * Jalankan: https://cahayapos.id/diagnose.php
 */

// Keamanan: Batasi akses dengan parameter ?key=rahasia123
if (!isset($_GET['key']) || $_GET['key'] !== 'rahasia123') {
    http_response_code(403);
    die('<h1>Akses Ditolak</h1><p>Parameter key tidak valid atau tidak disertakan.</p>');
}

echo "<h2>🔍 Diagnostik Logo - CahayaPOS</h2><pre>";

$laravelPath = __DIR__ . '/../laravel';

// 1. Check storage directory
echo "=== 1. Cek Direktori Storage ===\n";
$dirs = [
    'storage' => $laravelPath . '/storage',
    'storage/app' => $laravelPath . '/storage/app',
    'storage/app/public' => $laravelPath . '/storage/app/public',
    'storage/app/public/logos' => $laravelPath . '/storage/app/public/logos',
];

foreach ($dirs as $name => $path) {
    if (is_dir($path)) {
        $writable = is_writable($path) ? '✅ Writable' : '❌ NOT Writable';
        $perms = substr(sprintf('%o', fileperms($path)), -4);
        echo "  {$name}: EXISTS | {$writable} | Perms: {$perms}\n";
    } else {
        echo "  {$name}: ❌ NOT EXISTS\n";
    }
}

// 2. List files in logos directory
echo "\n=== 2. File di storage/app/public/logos ===\n";
$logosDir = $laravelPath . '/storage/app/public/logos';
if (is_dir($logosDir)) {
    $files = scandir($logosDir);
    $files = array_diff($files, ['.', '..']);
    if (empty($files)) {
        echo "  (kosong - belum ada logo terupload)\n";
    } else {
        foreach ($files as $f) {
            $size = filesize($logosDir . '/' . $f);
            echo "  📄 {$f} ({$size} bytes)\n";
        }
    }
} else {
    echo "  ❌ Direktori logos belum ada\n";
}

// 3. Check database for store_logo
echo "\n=== 3. Cek Database store_logo ===\n";
try {
    $dbPath = $laravelPath . '/database/database.sqlite';
    if (file_exists($dbPath)) {
        $db = new SQLite3($dbPath);
        $result = $db->querySingle("SELECT value FROM settings WHERE key='store_logo'");
        echo "  store_logo value: " . ($result ?: '(null/kosong)') . "\n";
        $db->close();
    } else {
        echo "  ❌ Database tidak ditemukan\n";
    }
} catch (Exception $e) {
    echo "  ❌ Error: " . $e->getMessage() . "\n";
}

// 4. Test write to logos
echo "\n=== 4. Test Tulis File ke logos ===\n";
if (!is_dir($logosDir)) {
    mkdir($logosDir, 0775, true);
    echo "  Created logos directory\n";
}
$testFile = $logosDir . '/test_write.txt';
$writeResult = @file_put_contents($testFile, 'test ' . date('Y-m-d H:i:s'));
if ($writeResult !== false) {
    echo "  ✅ Berhasil menulis file ke logos directory\n";
    unlink($testFile);
} else {
    echo "  ❌ GAGAL menulis file ke logos directory!\n";
}

// 5. Check database writable
echo "\n=== 5. Cek Database Writable ===\n";
$dbPath = $laravelPath . '/database/database.sqlite';
echo "  Database file: " . (is_writable($dbPath) ? '✅ Writable' : '❌ NOT Writable') . "\n";
echo "  Database dir:  " . (is_writable($laravelPath . '/database') ? '✅ Writable' : '❌ NOT Writable') . "\n";

// 6. Check PHP upload settings
echo "\n=== 6. PHP Upload Settings ===\n";
echo "  file_uploads: " . ini_get('file_uploads') . "\n";
echo "  upload_max_filesize: " . ini_get('upload_max_filesize') . "\n";
echo "  post_max_size: " . ini_get('post_max_size') . "\n";
echo "  upload_tmp_dir: " . (ini_get('upload_tmp_dir') ?: '(default)') . "\n";

// 7. Check Laravel log for errors
echo "\n=== 7. Laravel Log (last 20 lines) ===\n";
$logFile = $laravelPath . '/storage/logs/laravel.log';
if (file_exists($logFile)) {
    $lines = file($logFile);
    $lastLines = array_slice($lines, -20);
    foreach ($lastLines as $line) {
        echo "  " . htmlspecialchars(trim($line)) . "\n";
    }
    if (empty($lastLines)) {
        echo "  (log kosong)\n";
    }
} else {
    echo "  (file log belum ada)\n";
}

echo "\n</pre>";
echo "<p><b>Salin/screenshot halaman ini dan bagikan ke developer.</b></p>";
?>
