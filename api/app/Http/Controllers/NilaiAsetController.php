<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NilaiAsetController extends Controller
{
    public function index()
    {
        // Get all categories and calculate sum of stok and nilai aset per category
        $asetPerKategori = DB::table('categories as c')
            ->leftJoin('products as p', 'c.id', '=', 'p.category_id')
            ->selectRaw('
                c.name as kategori,
                COALESCE(SUM(p.stok_saat_ini), 0) as total_stok,
                COALESCE(SUM(p.stok_saat_ini * p.harga_beli), 0) as nilai_aset
            ')
            ->groupBy('c.id', 'c.name')
            ->orderByDesc('nilai_aset')
            ->get();

        $totalNilaiAsetOverall = $asetPerKategori->sum('nilai_aset');

        // Calculate persentase
        $formattedData = $asetPerKategori->map(function ($item) use ($totalNilaiAsetOverall) {
            $persentase = $totalNilaiAsetOverall > 0 
                ? round(($item->nilai_aset / $totalNilaiAsetOverall) * 100, 1) 
                : 0;
            return [
                'kategori' => $item->kategori,
                'total_stok' => (int) $item->total_stok,
                'nilai_aset' => (float) $item->nilai_aset,
                'persentase' => $persentase
            ];
        });

        // Filter out categories having 0 stok to make the chart cleaner, unless all are 0
        $filteredData = $formattedData->filter(function ($item) {
            return $item['total_stok'] > 0;
        })->values();

        // If everything is 0, just return the empty or unfiltered structure
        if ($filteredData->isEmpty()) {
            $filteredData = $formattedData;
        }

        return response()->json([
            'total_nilai_aset' => $totalNilaiAsetOverall,
            'total_stok_keseluruhan' => $formattedData->sum('total_stok'),
            'total_kategori_aktif' => $filteredData->count(),
            'data_kategori' => $filteredData
        ]);
    }
}
