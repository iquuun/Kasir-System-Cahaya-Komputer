<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->string('status_bayar')->default('lunas')->after('kembalian'); // 'lunas' or 'dp'
            $table->decimal('sisa_bayar', 15, 2)->default(0)->after('status_bayar');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn(['status_bayar', 'sisa_bayar']);
        });
    }
};
