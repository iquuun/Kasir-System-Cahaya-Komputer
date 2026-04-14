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

        // 1. Total Penjualan (Berdasarkan Range - Menggunakan Net / Masuk DP sesuai diskusi laba manual)
        $totalPenjualan = DB::table('sales')
            ->whereBetween('tanggal', [$start, $end])
            ->sum('masuk_dp');

        // 2. Laba Bersih (Profit Berdasarkan Range)
        // Rumus: Masuk DP - Harga Modal Manual
        $labaStats = DB::table('sales')
            ->whereBetween('tanggal', [$start, $end])
            ->selectRaw('SUM(masuk_dp) as pendapatan, SUM(harga_modal_manual) as modal')
            ->first();
        
        $labaKotor = (float) (($labaStats->pendapatan ?? 0) - ($labaStats->modal ?? 0));

        // 3. Saldo Kas (Dari Cash Flows)
        $saldoKasData = DB::table('cash_flows')->selectRaw("
            SUM(CASE WHEN tipe = 'masuk' THEN nominal ELSE 0 END) -
            SUM(CASE WHEN tipe = 'keluar' THEN nominal ELSE 0 END) as saldo
        ")->first();
        $saldoKas = $saldoKasData ? (float) $saldoKasData->saldo : 0;

        // 4. Hutang Distributor (Pembelian yang belum Lunas)
        $hutangDistributorData = DB::select("SELECT SUM(total_pembelian - terbayar) as sisa_hutang FROM purchases WHERE status_pembayaran = 'hutang'");
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
                ->sum('masuk_dp');
            
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
                    'total' => (float) $sale->masuk_dp, // Use net for consistency
                    'date' => Carbon::parse($sale->tanggal)->format('d M Y'),
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
            'subtitle' => $range === 'weekly'
                ? $start->translatedFormat('j M') . ' — ' . $end->translatedFormat('j M Y')
                : 'Bulan ' . $now->translatedFormat('F Y')
        ]);
    }
}
