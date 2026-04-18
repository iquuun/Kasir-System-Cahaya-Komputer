<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $range = $request->input('range', 'weekly');
        $now = Carbon::now();
        
        if ($range === 'monthly') {
            $start = $now->copy()->startOfMonth();
            $end = $now->copy()->endOfMonth();
        } else {
            $start = $now->copy()->startOfWeek();
            $end = $now->copy()->endOfWeek();
        }

        // Previous period for comparison
        $prevStart = $start->copy()->subDays($start->diffInDays($end) + 1);
        $prevEnd = $start->copy()->subSecond();

        // Optimized Stats Query (Single scan for current and previous period)
        $stats = DB::table('sales')
            ->whereBetween('tanggal', [$prevStart, $end])
            ->selectRaw("
                SUM(CASE WHEN tanggal >= ? THEN masuk_dp ELSE 0 END) as curr_penjualan,
                SUM(CASE WHEN tanggal < ? THEN masuk_dp ELSE 0 END) as prev_penjualan,
                SUM(CASE WHEN tanggal >= ? THEN (masuk_dp - harga_modal_manual) ELSE 0 END) as curr_laba,
                SUM(CASE WHEN tanggal < ? THEN (masuk_dp - harga_modal_manual) ELSE 0 END) as prev_laba,
                COUNT(CASE WHEN tanggal >= ? THEN 1 END) as curr_count,
                COUNT(CASE WHEN tanggal < ? THEN 1 END) as prev_count
            ", [$start, $start, $start, $start, $start, $start])
            ->first();

        $totalPenjualan = (float) ($stats->curr_penjualan ?? 0);
        $prevTotalPenjualan = (float) ($stats->prev_penjualan ?? 0);
        $trendPenjualan = $prevTotalPenjualan > 0 ? round((($totalPenjualan - $prevTotalPenjualan) / $prevTotalPenjualan) * 100, 1) : 0;

        $labaKotor = (float) ($stats->curr_laba ?? 0);
        $prevLabaKotor = (float) ($stats->prev_laba ?? 0);
        $trendLaba = $prevLabaKotor > 0 ? round((($labaKotor - $prevLabaKotor) / $prevLabaKotor) * 100, 1) : 0;

        $totalTransaksi = (int) ($stats->curr_count ?? 0);
        $prevTotalTransaksi = (int) ($stats->prev_count ?? 0);
        $trendTransaksi = $prevTotalTransaksi > 0 ? round((($totalTransaksi - $prevTotalTransaksi) / $prevTotalTransaksi) * 100, 1) : 0;

        // Other Stats
        $saldoKasData = DB::table('cash_flows')->selectRaw("
            SUM(CASE WHEN tipe = 'masuk' THEN nominal ELSE 0 END) -
            SUM(CASE WHEN tipe = 'keluar' THEN nominal ELSE 0 END) as saldo
        ")->first();
        $saldoKas = (float) ($saldoKasData->saldo ?? 0);

        $hutangDistributor = (float) DB::table('purchases')
            ->where('status_pembayaran', 'hutang')
            ->sum(DB::raw('total_pembelian - terbayar'));

        $nilaiAset = (float) DB::table('products')
            ->whereNull('deleted_at')
            ->sum(DB::raw('stok_saat_ini * harga_beli'));

        // Chart Data (Optimized with GROUP BY)
        $chartDataRaw = DB::table('sales')
            ->whereBetween('tanggal', [$start, $end])
            ->selectRaw("DATE(tanggal) as tgl, SUM(masuk_dp) as total")
            ->groupBy('tgl')
            ->get()
            ->pluck('total', 'tgl');

        $grafikData = [];
        $days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
        for ($i = 0; $i < ($range === 'monthly' ? $now->daysInMonth : 7); $i++) {
            $dateObj = $start->copy()->addDays($i);
            $dateStr = $dateObj->toDateString();
            
            if ($range === 'monthly') {
                $grafikData[] = [
                    'name' => $dateObj->format('d'),
                    'value' => (float) ($chartDataRaw[$dateStr] ?? 0)
                ];
            } else {
                $grafikData[] = [
                    'name' => $days[$i] ?? $dateObj->format('D'),
                    'value' => (float) ($chartDataRaw[$dateStr] ?? 0)
                ];
            }
        }

        // Recent Transactions
        $transaksiTerbaru = DB::table('sales')
            ->orderBy('tanggal', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($sale) {
                return [
                    'id' => $sale->invoice ?? '-',
                    'customer' => 'UMUM',
                    'total' => (float) $sale->masuk_dp,
                    'date' => Carbon::parse($sale->tanggal)->format('d M Y'),
                    'time' => Carbon::parse($sale->tanggal)->format('H:i')
                ];
            });

        return response()->json([
            'stats' => [
                'total_penjualan' => $totalPenjualan,
                'trend_penjualan' => $trendPenjualan,
                'laba_kotor' => $labaKotor,
                'trend_laba' => $trendLaba,
                'saldo_kas' => $saldoKas,
                'hutang_distributor' => $hutangDistributor,
                'nilai_aset' => $nilaiAset,
                'total_transaksi' => $totalTransaksi,
                'trend_transaksi' => $trendTransaksi,
            ],
            'chart_data' => $grafikData,
            'recent_transactions' => $transaksiTerbaru,
            'low_stock' => [], // Add logic if needed
            'range' => $range,
            'subtitle' => $range === 'weekly'
                ? $start->translatedFormat('j M') . ' — ' . $end->translatedFormat('j M Y')
                : 'Bulan ' . $now->translatedFormat('F Y')
        ]);
    }
}
