<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration 
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->string('invoice')->unique()->after('id');
            $table->string('channel')->default('Offline')->after('invoice');
            $table->decimal('pembayaran', 15, 2)->default(0)->after('total_penjualan');
            $table->decimal('kembalian', 15, 2)->default(0)->after('pembayaran');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
        //
        });
    }
};
