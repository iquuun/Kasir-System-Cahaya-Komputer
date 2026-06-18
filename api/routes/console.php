<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use Illuminate\Support\Facades\Schedule;

// Jadwal Backup Database setiap jam 00:00 (Tengah Malam)
Schedule::command('backup:run --only-db')->dailyAt('00:00');
