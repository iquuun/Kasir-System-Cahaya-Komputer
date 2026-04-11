<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeSalary extends Model
{
    protected $fillable = [
        'employee_id', 
        'tanggal', 
        'gaji_pokok', 
        'bonus', 
        'potongan', 
        'total', 
        'keterangan', 
        'cash_flow_id'
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function cashFlow()
    {
        return $this->belongsTo(CashFlow::class);
    }
}
