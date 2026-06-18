<?php
/**
 * Script Setup Satu Kali untuk Hostinger
 * Jalankan di browser: https://cahayapos.id/setup.php
 * HAPUS FILE INI SETELAH SELESAI!
 */

// Keamanan: Batasi akses dengan parameter ?key=rahasia123
if (!isset($_GET['key']) || $_GET['key'] !== 'rahasia123') {
    http_response_code(403);
    die('<h1>Akses Ditolak</h1><p>Parameter key tidak valid atau tidak disertakan.</p>');
}

echo "<h2>🔧 Setup Hostinger - CahayaPOS</h2><pre>";

$laravelPath = __DIR__ . '/../laravel';

// 1. Set permissions on storage directories
echo "--- Setting Storage Permissions ---\n";
$storageDirs = [
    $laravelPath . '/storage',
    $laravelPath . '/storage/app',
    $laravelPath . '/storage/app/public',
    $laravelPath . '/storage/app/public/logos',
    $laravelPath . '/storage/framework',
    $laravelPath . '/storage/framework/cache',
    $laravelPath . '/storage/framework/cache/data',
    $laravelPath . '/storage/framework/sessions',
    $laravelPath . '/storage/framework/views',
    $laravelPath . '/storage/logs',
];

foreach ($storageDirs as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
        echo "✅ Created: " . basename($dir) . "\n";
    } else {
        chmod($dir, 0775);
        echo "✅ Permission set: " . basename($dir) . "\n";
    }
}

// 2. Set database permissions
echo "\n--- Setting Database Permissions ---\n";
$dbFile = $laravelPath . '/database/database.sqlite';
if (file_exists($dbFile)) {
    chmod($dbFile, 0664);
    chmod($laravelPath . '/database', 0775);
    echo "✅ Database permissions set\n";
} else {
    echo "⚠️ Database file not found\n";
}

// 3. Create bootstrap/cache directory
echo "\n--- Bootstrap Cache ---\n";
$bootstrapCache = $laravelPath . '/bootstrap/cache';
if (!is_dir($bootstrapCache)) {
    mkdir($bootstrapCache, 0775, true);
    echo "✅ Created bootstrap/cache\n";
} else {
    chmod($bootstrapCache, 0775);
    echo "✅ Bootstrap cache permissions set\n";
}

// 4. Create storage symlink in public_html
echo "\n--- Creating Storage Symlink ---\n";
$symlinkTarget = $laravelPath . '/storage/app/public';
$symlinkLink = __DIR__ . '/storage';

if (is_link($symlinkLink)) {
    echo "✅ Storage symlink already exists\n";
} elseif (file_exists($symlinkLink)) {
    echo "⚠️ /storage exists but is not a symlink. Removing...\n";
    if (is_dir($symlinkLink)) {
        rmdir($symlinkLink);
    } else {
        unlink($symlinkLink);
    }
    symlink($symlinkTarget, $symlinkLink);
    echo "✅ Storage symlink created\n";
} else {
    symlink($symlinkTarget, $symlinkLink);
    echo "✅ Storage symlink created\n";
}

// 5. Create .htaccess in storage/app/public for direct access
echo "\n--- Storage .htaccess ---\n";
$storageHtaccess = $laravelPath . '/storage/app/public/.htaccess';
if (!file_exists($storageHtaccess)) {
    file_put_contents($storageHtaccess, "Options -Indexes\n");
    echo "✅ Storage .htaccess created\n";
} else {
    echo "✅ Storage .htaccess exists\n";
}

// 6. Create log file
echo "\n--- Log File ---\n";
$logFile = $laravelPath . '/storage/logs/laravel.log';
if (!file_exists($logFile)) {
    file_put_contents($logFile, '');
    chmod($logFile, 0664);
    echo "✅ Log file created\n";
} else {
    echo "✅ Log file exists\n";
}

echo "\n</pre>";
echo "<h3 style='color:green'>✅ Setup selesai! Silakan hapus file setup.php ini dari public_html.</h3>";
echo "<p><a href='/'>← Kembali ke halaman utama</a></p>";
?>
