<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    protected $fillable = [
        'invoice',
        'channel',
        'tanggal',
        'total_penjualan',
        'total_hpp',
        'laba_kotor',
        'tax_percent',
        'tax_amount',
        'pembayaran',
        'kembalian',
        'user_id'
    ];

    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
