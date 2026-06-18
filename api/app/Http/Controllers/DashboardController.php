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
        
        if ($range === 'yearly') {
            $start = $now->copy()->startOfYear();
            $end = $now->copy()->endOfYear();
        } elseif ($range === 'monthly') {
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
                SUM(CASE WHEN tanggal >= ? THEN total_penjualan ELSE 0 END) as curr_penjualan,
                SUM(CASE WHEN tanggal < ? THEN total_penjualan ELSE 0 END) as prev_penjualan,
                SUM(CASE WHEN tanggal >= ? THEN (total_penjualan - harga_modal_manual) ELSE 0 END) as curr_laba,
                SUM(CASE WHEN tanggal < ? THEN (total_penjualan - harga_modal_manual) ELSE 0 END) as prev_laba,
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
        if ($range === 'yearly') {
            $chartDataPenjualanRaw = DB::table('sales')
                ->whereBetween('tanggal', [$start, $end])
                ->selectRaw("DATE(tanggal) as tgl, SUM(total_penjualan) as total, SUM(total_penjualan - harga_modal_manual) as laba")
                ->groupBy('tgl')
                ->get();

            $pembelianDataRaw = DB::table('purchases')
                ->whereBetween('tanggal', [$start, $end])
                ->selectRaw("DATE(tanggal) as tgl, SUM(total_pembelian) as total")
                ->groupBy('tgl')
                ->get();

            $penjualanData = [];
            $labaData = [];
            $pembelianData = [];

            foreach ($chartDataPenjualanRaw as $row) {
                if ($row->tgl) {
                    $monthNum = date('m', strtotime($row->tgl));
                    $penjualanData[$monthNum] = ($penjualanData[$monthNum] ?? 0) + (float) $row->total;
                    $labaData[$monthNum] = ($labaData[$monthNum] ?? 0) + (float) $row->laba;
                }
            }

            foreach ($pembelianDataRaw as $row) {
                if ($row->tgl) {
                    $monthNum = date('m', strtotime($row->tgl));
                    $pembelianData[$monthNum] = ($pembelianData[$monthNum] ?? 0) + (float) $row->total;
                }
            }
        } else {
            $chartDataPenjualanRaw = DB::table('sales')
                ->whereBetween('tanggal', [$start, $end])
                ->selectRaw("DATE(tanggal) as tgl, SUM(total_penjualan) as total, SUM(total_penjualan - harga_modal_manual) as laba")
                ->groupBy('tgl')
                ->get();
            $penjualanData = $chartDataPenjualanRaw->pluck('total', 'tgl');
            $labaData = $chartDataPenjualanRaw->pluck('laba', 'tgl');

            $pembelianData = DB::table('purchases')
                ->whereBetween('tanggal', [$start, $end])
                ->selectRaw("DATE(tanggal) as tgl, SUM(total_pembelian) as total")
                ->groupBy('tgl')
                ->get()
                ->pluck('total', 'tgl');
        }

        $grafikData = [];
        if ($range === 'yearly') {
            $months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
            for ($i = 1; $i <= 12; $i++) {
                $key = str_pad($i, 2, '0', STR_PAD_LEFT);
                $penjualan = (float) ($penjualanData[$key] ?? 0);
                $pembelian = (float) ($pembelianData[$key] ?? 0);
                $laba = (float) ($labaData[$key] ?? 0);

                $grafikData[] = [
                    'name' => $months[$i - 1],
                    'penjualan' => $penjualan,
                    'pembelian' => $pembelian,
                    'laba' => $laba
                ];
            }
        } else {
            $days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
            for ($i = 0; $i < ($range === 'monthly' ? $start->daysInMonth : 7); $i++) {
                $dateObj = $start->copy()->addDays($i);
                $dateStr = $dateObj->toDateString();
                
                $penjualan = (float) ($penjualanData[$dateStr] ?? 0);
                $pembelian = (float) ($pembelianData[$dateStr] ?? 0);
                $laba = (float) ($labaData[$dateStr] ?? 0);

                if ($range === 'monthly') {
                    $grafikData[] = [
                        'name' => $dateObj->format('d'),
                        'penjualan' => $penjualan,
                        'pembelian' => $pembelian,
                        'laba' => $laba
                    ];
                } else {
                    $grafikData[] = [
                        'name' => $days[$i] ?? $dateObj->format('D'),
                        'penjualan' => $penjualan,
                        'pembelian' => $pembelian,
                        'laba' => $laba
                    ];
                }
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
                    'total' => (float) $sale->total_penjualan,
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
                ? 'Mingguan - ' . $now->translatedFormat('F Y') . ' (' . $start->translatedFormat('j M') . ' — ' . $end->translatedFormat('j M Y') . ')'
                : ($range === 'monthly'
                    ? 'Bulanan - ' . $now->translatedFormat('F Y')
                    : 'Tahunan - Januari s/d Desember ' . $now->translatedFormat('Y'))
        ]);
    }
}
