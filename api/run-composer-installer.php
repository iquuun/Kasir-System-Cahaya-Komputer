<?php
// Set execution time to 5 minutes
set_time_limit(300);
chdir(__DIR__);

echo "🚀 Starting Composer installation...\n";
echo "📂 Current Directory: " . getcwd() . "\n";

// 1. Download composer.phar
echo "⏳ Downloading composer.phar...\n";
copy('https://getcomposer.org/composer-stable.phar', 'composer.phar');

if (file_exists('composer.phar')) {
    echo "[✔] Downloaded composer.phar successfully.\n";
} else {
    die("❌ Failed to download composer.phar\n");
}

// 2. Run composer.phar install
echo "⏳ Running composer.phar install...\n";
$output = [];
$exitCode = 0;
exec('php composer.phar install --no-dev --optimize-autoloader 2>&1', $output, $exitCode);

echo "🏁 Exit Code: $exitCode\n";
echo "Output:\n" . implode("\n", $output) . "\n";

// 3. Clean up
if (file_exists('composer.phar')) {
    unlink('composer.phar');
    echo "[✔] Cleaned up composer.phar\n";
}
echo "✨ Process finished.\n";
