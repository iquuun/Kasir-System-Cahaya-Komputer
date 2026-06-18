<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::create([
            'name' => 'Owner Cahaya',
            'email' => 'owner@cahaya.id',
            'password' => bcrypt('password123'),
            'role' => 'owner',
        ]);

        User::create([
            'name' => 'Staf Cahaya',
            'email' => 'staf@cahaya.id',
            'password' => bcrypt('password123'),
            'role' => 'staf',
        ]);
    }
}
