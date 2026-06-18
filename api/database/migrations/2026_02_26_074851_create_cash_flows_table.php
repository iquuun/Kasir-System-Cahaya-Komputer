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
        Schema::create('cash_flows', function (Blueprint $table) {
            $table->id();
            $table->dateTime('tanggal');
            $table->enum('tipe', ['masuk', 'keluar']);
            $table->enum('sumber', ['shopee', 'lazada', 'tiktok', 'tokopedia', 'offline', 'bayar_distributor', 'biaya_operasional', 'biaya_umum']);
            $table->decimal('nominal', 15, 2);
            $table->string('keterangan')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_flows');
    }
};
