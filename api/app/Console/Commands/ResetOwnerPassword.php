<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class ResetOwnerPassword extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:reset-owner';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reset owner password to password123';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $owner = User::where('role', 'owner')->first();
        if ($owner) {
            $owner->password = Hash::make('password123');
            $owner->save();
            $this->info('Owner password has been reset to password123');
        } else {
            $this->error('Owner user not found!');
        }
    }
}
