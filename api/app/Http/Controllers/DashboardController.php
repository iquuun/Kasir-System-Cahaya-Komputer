<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $range = $request->get('range', 'weekly');
        $now = Carbon::now();
        
        if ($range === 'monthly') {
            $start = $now->copy()->startOfMonth();
            $end = $now->copy()->endOfMonth();
        } else {
            $start = $now->copy()->startOfWeek();
            $end = $now->copy()->endOfWeek();
        }

        $startOfMonth = $now->copy()->startOfMonth();

        // 1. Total Penjualan (Berdasarkan Range)
        $totalPenjualan = DB::table('sales')
            ->whereBetween('tanggal', [$start, $end])
            ->sum('total_penjualan');

        // 2. Laba Kotor (Berdasarkan Range)
        $labaKotorRaw = DB::select("
            SELECT SUM(si.qty * (si.harga_jual_saat_itu - COALESCE(p.harga_beli, 0))) as laba
            FROM sales s
            JOIN sale_items si ON s.id = si.sale_id
            LEFT JOIN products p ON p.id = si.product_id
            WHERE s.tanggal BETWEEN ? AND ?
        ", [$start, $end]);
        
        $labaKotorArray = (array) $labaKotorRaw[0];
        $labaKotor = $labaKotorArray['laba'] ?? 0;

        // 3. Saldo Kas (Dari Cash Flows)
        $saldoKasData = DB::table('cash_flows')->selectRaw("
            SUM(CASE WHEN tipe = 'masuk' THEN nominal ELSE 0 END) -
            SUM(CASE WHEN tipe = 'keluar' THEN nominal ELSE 0 END) as saldo
        ")->first();
        $saldoKas = $saldoKasData ? (float) $saldoKasData->saldo : 0;

        // 4. Hutang Distributor (Pembelian yang belum Lunas)
        $hutangDistributorData = DB::select("SELECT SUM(total_pembelian - terbayar) as sisa_hutang FROM purchases WHERE status_pembayaran = 'belum_lunas'");
        $hutangDistributorArray = (array) $hutangDistributorData[0];
        $hutangDistributor = $hutangDistributorArray['sisa_hutang'] ?? 0;

        // 5. Nilai Aset (Total Stok * HPP / Harga Modal Saat Ini)
        $nilaiAset = DB::table('products')->sum(DB::raw('stok_saat_ini * harga_beli'));

        // 6. Total Transaksi (Berdasarkan Range)
        $totalTransaksi = DB::table('sales')
            ->whereBetween('tanggal', [$start, $end])
            ->count();

        // 7. Data Grafik Penjualan 7 Hari Terakhir (Tetap 7 hari terakhir agar visual konsisten)
        $grafikData = [];
        $days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
        $graphStart = $now->copy()->startOfWeek();
        
        for ($i = 0; $i < 7; $i++) {
            $date = $graphStart->copy()->addDays($i);
            $dailyTotal = DB::table('sales')
                ->whereDate('tanggal', $date->toDateString())
                ->sum('total_penjualan');
            
            $grafikData[] = [
                'name' => substr($days[$i], 0, 3), 
                'value' => (float) $dailyTotal
            ];
        }

        // 8. Transaksi Terbaru (5 Teratas)
        $transaksiTerbaru = DB::table('sales')
            ->orderBy('tanggal', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($sale) {
                return [
                    'id' => isset($sale->invoice) ? $sale->invoice : '-',
                    'customer' => 'UMUM',
                    'total' => (float) $sale->total_penjualan,
                    'time' => Carbon::parse($sale->tanggal)->format('H:i')
                ];
            });

        return response()->json([
            'stats' => [
                'total_penjualan' => (float) $totalPenjualan,
                'laba_kotor' => (float) $labaKotor,
                'saldo_kas' => (float) $saldoKas,
                'hutang_distributor' => (float) $hutangDistributor,
                'nilai_aset' => (float) $nilaiAset,
                'total_transaksi' => $totalTransaksi,
            ],
            'chart_data' => $grafikData,
            'recent_transactions' => $transaksiTerbaru,
            'low_stock' => [],
            'range' => $range,
            'subtitle' => $range === 'weekly' ? 'Minggu ini' : 'Bulan ini'
        ]);
    }
}
