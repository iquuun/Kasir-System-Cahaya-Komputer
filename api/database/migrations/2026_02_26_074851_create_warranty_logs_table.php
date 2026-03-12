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
        Schema::create('warranty_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('warranty_id')->constrained()->onDelete('cascade');
            $table->string('status');
            $table->text('catatan')->nullable();
            $table->dateTime('tanggal');
            $table->foreignId('user_id')->constrained('app_users')->onDelete('restrict');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('warranty_logs');
    }
};
