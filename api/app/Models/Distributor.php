<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Distributor extends Model
{
    protected $fillable = [
        'name',
        'phone',
        'address',
    ];

    public function purchases()
    {
        return $this->hasMany(Purchase::class);
    }
}
