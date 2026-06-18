<?php
// Script to run migrations via web browser for Hostinger production or local dev.
// Usage: https://cahayapos.id/run_migration.php (or locally at http://localhost/.../run_migration.php)

// Keamanan: Batasi akses dengan parameter ?key=rahasia123
if (!isset($_GET['key']) || $_GET['key'] !== 'rahasia123') {
    http_response_code(403);
    die('<h1>Akses Ditolak</h1><p>Parameter key tidak valid atau tidak disertakan.</p>');
}

echo "<h2>🔧 Running Laravel Migrations...</h2><pre>";

// Find Laravel bootstrap files
$possiblePaths = [
    __DIR__ . '/../laravel', // Hostinger production path
    __DIR__ . '/..',         // Local path
];

$laravelPath = null;
foreach ($possiblePaths as $path) {
    if (file_exists($path . '/bootstrap/app.php') && file_exists($path . '/vendor/autoload.php')) {
        $laravelPath = realpath($path);
        break;
    }
}

if (!$laravelPath) {
    die("❌ Error: Could not find Laravel bootstrap files.");
}

echo "Found Laravel root path: " . $laravelPath . "\n";

// Boot Composer Autoloader
require $laravelPath . '/vendor/autoload.php';

// Boot Laravel App
$app = require_once $laravelPath . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Artisan;

try {
    echo "Running artisan migrate --force...\n";
    $exitCode = Artisan::call('migrate', ['--force' => true]);
    $output = Artisan::output();
    
    echo "Exit Code: " . $exitCode . "\n";
    echo "Output:\n" . ($output ?: "No output (database already up-to-date or migration ran silently)\n");
    
    if ($exitCode === 0) {
        echo "✅ Migration completed successfully!\n";
    } else {
        echo "❌ Migration failed with exit code " . $exitCode . "\n";
    }
} catch (\Exception $e) {
    echo "❌ Exception occurred: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}

echo "</pre>";
?>
