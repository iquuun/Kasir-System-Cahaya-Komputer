<?php

namespace App\Http\Controllers;

use App\Models\Distributor;
use Illuminate\Http\Request;

class DistributorController extends Controller
{
    public function index()
    {
        return response()->json(
            Distributor::withCount('purchases')
            ->withSum('purchases', 'total_pembelian')
            ->orderBy('name')
            ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
        ]);

        $distributor = Distributor::create($validated);
        return response()->json($distributor, 201);
    }

    public function show(Distributor $distributor)
    {
        return response()->json($distributor);
    }

    public function update(Request $request, Distributor $distributor)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
        ]);

        $distributor->update($validated);
        return response()->json($distributor);
    }

    public function destroy(Distributor $distributor)
    {
        $distributor->delete();
        return response()->json(['message' => 'Distributor deleted successfully']);
    }
}
