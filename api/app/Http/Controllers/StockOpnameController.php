<?php

namespace App\Http\Controllers;

use App\Models\StockOpname;
use App\Models\StockOpnameItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StockOpnameController extends Controller
{
    public function index()
    {
        $opnames = StockOpname::with('items.product', 'creator')->orderBy('id', 'desc')->get();
        return response()->json($opnames);
    }

    public function store(Request $request)
    {
        $request->validate([
            'tanggal' => 'required|date',
            'keterangan' => 'nullable|string',
            'items' => 'required|array',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.stok_sistem' => 'required|numeric',
            'items.*.stok_fisik' => 'required|numeric',
            'items.*.selisih' => 'required|numeric',
        ]);

        try {
            DB::beginTransaction();

            $opname = StockOpname::create([
                'tanggal' => $request->tanggal,
                'keterangan' => $request->keterangan,
                'created_by' => $request->user()->id,
            ]);

            foreach ($request->items as $itemData) {
                // If there's a difference, update product stock
                if ($itemData['selisih'] != 0) {
                    $product = Product::find($itemData['product_id']);
                    if ($product) {
                        $product->stok_saat_ini = $itemData['stok_fisik'];
                        $product->save();
                    }
                }

                StockOpnameItem::create([
                    'stock_opname_id' => $opname->id,
                    'product_id' => $itemData['product_id'],
                    'stok_sistem' => $itemData['stok_sistem'],
                    'stok_fisik' => $itemData['stok_fisik'],
                    'selisih' => $itemData['selisih'],
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Stok Opname berhasil disimpan',
                'data' => $opname->load('items')
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Stock Opname error: ' . $e->getMessage());
            return response()->json(['message' => 'Terjadi kesalahan sistem', 'error' => $e->getMessage()], 500);
        }
    }
}
