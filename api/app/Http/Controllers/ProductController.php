<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index()
    {
        // Load products with their category
        return response()->json(Product::with('category')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'harga_beli' => 'required|numeric|min:0',
            'harga_jual' => 'required|numeric|min:0',
            'stok_saat_ini' => 'integer|min:0'
        ]);

        $product = Product::create($request->all());
        return response()->json($product->load('category'), 201);
    }

    public function show($id)
    {
        return response()->json(Product::with('category')->findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'harga_beli' => 'required|numeric|min:0',
            'harga_jual' => 'required|numeric|min:0',
            'stok_saat_ini' => 'integer|min:0'
        ]);

        $product->update($request->all());
        return response()->json($product->load('category'));
    }

    public function destroy($id)
    {
        Product::destroy($id);
        return response()->json(null, 204);
    }
}
