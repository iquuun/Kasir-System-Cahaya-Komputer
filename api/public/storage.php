<?php
/**
 * Storage File Proxy for Hostinger (no symlink needed)
 * Routes: /storage/logos/filename.png -> laravel/storage/app/public/logos/filename.png
 */

$file = $_GET['file'] ?? '';

if (empty($file)) {
    http_response_code(404);
    exit('Not found');
}

// Security: prevent directory traversal using realpath validation
$basePath = realpath(__DIR__ . '/../laravel/storage/app/public');
if ($basePath === false) {
    // Fallback if directory does not exist or paths are resolved differently in some envs
    $basePath = realpath(__DIR__ . '/..') . '/laravel/storage/app/public';
}

$storagePath = realpath($basePath . '/' . $file);

// Check if the resolved path is inside the base path and is a valid file
if ($storagePath === false || strpos($storagePath, $basePath) !== 0 || !is_file($storagePath)) {
    http_response_code(403);
    exit('Access Denied');
}

// Determine MIME type
$mimeTypes = [
    'png' => 'image/png',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'gif' => 'image/gif',
    'webp' => 'image/webp',
    'svg' => 'image/svg+xml',
    'pdf' => 'application/pdf',
    'ico' => 'image/x-icon',
];

$ext = strtolower(pathinfo($storagePath, PATHINFO_EXTENSION));
$mimeType = $mimeTypes[$ext] ?? mime_content_type($storagePath);

// Send headers
header('Content-Type: ' . $mimeType);
header('Content-Length: ' . filesize($storagePath));
header('Cache-Control: public, max-age=86400');
header('Access-Control-Allow-Origin: *');

// Output file
readfile($storagePath);
exit;
