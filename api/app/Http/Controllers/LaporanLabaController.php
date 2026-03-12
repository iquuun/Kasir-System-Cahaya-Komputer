<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class LaporanLabaController extends Controller
{
    public function index(Request $request)
    {
        $month = $request->query('month', 'all');
        $year = $request->query('year', Carbon::now()->year);
        $now = Carbon::now();

        if ($month === 'all') {
            $startDate = Carbon::create($year, 1, 1)->startOfYear();
            $endDate = Carbon::create($year, 12, 31)->endOfYear();
        } else {
            // Specific month
            $m = (int) $month;
            $startDate = Carbon::create($year, $m, 1)->startOfMonth();
            $endDate = Carbon::create($year, $m, 1)->endOfMonth();
        }

        // 1. Total Pendapatan
        $totalPendapatan = (float) DB::table('sales')
            ->whereBetween('tanggal', [$startDate->toDateString(), $endDate->toDateString()])
            ->sum('total_penjualan');

        // 2. Total HPP
        $hppQuery = DB::select("
            SELECT SUM(si.qty * COALESCE(p.harga_beli, 0)) as total_hpp
            FROM sales s
            JOIN sale_items si ON s.id = si.sale_id
            LEFT JOIN products p ON p.id = si.product_id
            WHERE s.tanggal BETWEEN ? AND ?
        ", [$startDate->toDateString(), $endDate->toDateString()]);
        
        $totalHPP = (float) ($hppQuery[0]->total_hpp ?? 0);

        // 3. Laba Kotor
        $labaKotor = $totalPendapatan - $totalHPP;

        // 4. Total Biaya Operasional (Pengeluaran dari cash flow)
        $totalBiaya = (float) DB::table('cash_flows')
            ->where('tipe', 'keluar')
            ->whereBetween('tanggal', [$startDate->toDateString(), $endDate->toDateString()])
            ->sum('nominal');

        // 5. Laba Bersih
        $labaBersih = $labaKotor - $totalBiaya;

        // 6. Monthly Data for Charts
        $monthlyData = [];
        for ($m_index = 1; $m_index <= 12; $m_index++) {
            $monthStart = Carbon::create($year, $m_index, 1)->startOfMonth();
            $monthEnd = Carbon::create($year, $m_index, 1)->endOfMonth();
            
            // Limit to current month or past months only (don't show future data)
            if ($monthStart->year >= $now->year && $monthStart->month > $now->month) {
                continue; 
            }

            $mPendapatan = (float) DB::table('sales')
                ->whereBetween('tanggal', [$monthStart->toDateString(), $monthEnd->toDateString()])
                ->sum('total_penjualan');

            $mHppQuery = DB::select("
                SELECT SUM(si.qty * COALESCE(p.harga_beli, 0)) as total_hpp
                FROM sales s
                JOIN sale_items si ON s.id = si.sale_id
                LEFT JOIN products p ON p.id = si.product_id
                WHERE s.tanggal BETWEEN ? AND ?
            ", [$monthStart->toDateString(), $monthEnd->toDateString()]);
            $mHpp = (float) ($mHppQuery[0]->total_hpp ?? 0);

            $mBiaya = (float) DB::table('cash_flows')
                ->where('tipe', 'keluar')
                ->whereBetween('tanggal', [$monthStart->toDateString(), $monthEnd->toDateString()])
                ->sum('nominal');

            $mMargin = $mPendapatan - $mHpp;
            $mLaba = $mMargin - $mBiaya;

            $monthlyData[] = [
                'bulan' => $monthStart->translatedFormat('M'), // Jan, Feb, Mar...
                'pendapatan' => $mPendapatan,
                'hpp' => $mHpp,
                'biaya' => $mBiaya,
                'laba' => $mLaba,
            ];
        }

        return response()->json([
            'summary' => [
                'total_pendapatan' => $totalPendapatan,
                'total_hpp' => $totalHPP,
                'total_biaya' => $totalBiaya,
                'laba_kotor' => $labaKotor,
                'laba_bersih' => $labaBersih,
            ],
            'monthlyData' => $monthlyData
        ]);
    }
}
