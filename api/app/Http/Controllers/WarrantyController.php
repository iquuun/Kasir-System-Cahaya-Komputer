<?php

namespace App\Http\Controllers;

use App\Models\Warranty;
use Illuminate\Http\Request;

class WarrantyController extends Controller
{
    public function index()
    {
        $warranties = Warranty::with('creator')->orderBy('id', 'desc')->get();
        return response()->json($warranties);
    }

    public function store(Request $request)
    {
        $request->validate([
            'customer_name' => 'required|string',
            'customer_phone' => 'required|string',
            'product_name' => 'required|string',
            'tanggal_masuk' => 'required|date',
            'status' => 'required|in:diterima_customer,dikirim_distributor,diterima_dari_distributor,dikirim_ke_customer',
            'catatan' => 'nullable|string',
            'nomor_resi' => 'nullable|string',
        ]);

        $warranty = Warranty::create([
            ...$request->all(),
            'created_by' => $request->user()->id,
        ]);

        return response()->json($warranty, 201);
    }

    public function update(Request $request, Warranty $warranty)
    {
        $request->validate([
            'customer_name' => 'required|string',
            'customer_phone' => 'required|string',
            'product_name' => 'required|string',
            'tanggal_masuk' => 'required|date',
            'status' => 'required|in:diterima_customer,dikirim_distributor,diterima_dari_distributor,dikirim_ke_customer',
            'catatan' => 'nullable|string',
            'nomor_resi' => 'nullable|string',
        ]);

        $warranty->update($request->all());

        return response()->json($warranty);
    }

    public function destroy(Warranty $warranty)
    {
        $warranty->delete();
        return response()->json(null, 204);
    }
}
