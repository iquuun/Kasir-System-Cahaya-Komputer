<?php

namespace App\Http\Controllers;

use App\Models\StockMovement;
use Illuminate\Http\Request;

class StockMovementController extends Controller
{
    public function index(Request $request)
    {
        $query = StockMovement::with('product')->orderBy('created_at', 'desc');

        if ($request->has('tipe') && $request->tipe !== 'all') {
            $query->where('tipe', $request->tipe);
        }

        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->has('bulan') && $request->bulan) {
            $query->whereRaw("strftime('%Y-%m', created_at) = ?", [$request->bulan]);
        }

        return response()->json($query->paginate($request->get('limit', 50)));
    }
}
