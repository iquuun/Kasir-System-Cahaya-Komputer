<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CashFlowController extends Controller
{
    public function index(Request $request)
    {
        $query = DB::table('cash_flows')->orderBy('tanggal', 'desc');

        if ($request->has('tipe') && $request->tipe !== 'all') {
            $query->where('tipe', $request->tipe);
        }

        if ($request->has('bulan') && $request->bulan) {
            $query->whereRaw('DATE_FORMAT(tanggal, "%Y-%m") = ?', [$request->bulan]);
        }

        $cashFlows = $query->get();

        $summary = DB::table('cash_flows')->selectRaw('
            SUM(CASE WHEN tipe = "masuk" THEN nominal ELSE 0 END) as total_masuk,
            SUM(CASE WHEN tipe = "keluar" THEN nominal ELSE 0 END) as total_keluar
        ')->first();

        return response()->json([
            'data' => $cashFlows,
            'total_masuk' => $summary->total_masuk ?? 0,
            'total_keluar' => $summary->total_keluar ?? 0,
            'saldo' => ($summary->total_masuk ?? 0) - ($summary->total_keluar ?? 0),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'tanggal' => 'required|date',
            'tipe' => 'required|in:masuk,keluar',
            'sumber' => 'required|string',
            'nominal' => 'required|numeric|min:1',
            'keterangan' => 'nullable|string',
        ]);

        $id = DB::table('cash_flows')->insertGetId([
            'tanggal' => $request->tanggal,
            'tipe' => $request->tipe,
            'sumber' => $request->sumber,
            'nominal' => $request->nominal,
            'keterangan' => $request->keterangan,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Cash flow berhasil ditambahkan', 'id' => $id], 201);
    }

    public function destroy($id)
    {
        DB::table('cash_flows')->where('id', $id)->delete();
        return response()->json(['message' => 'Cash flow berhasil dihapus']);
    }
}
