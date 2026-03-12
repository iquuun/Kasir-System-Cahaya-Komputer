<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Warranty extends Model
{
    protected $guarded = [];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
