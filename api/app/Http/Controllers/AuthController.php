<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        $email = trim($request->email);
        \Log::info("Login attempt for email: '{$email}'");

        $user = User::where('email', $email)->first();

        if (!$user) {
            \Log::warning("Login failed: User not found for email '{$email}'");
            return response()->json([
                'message' => 'Email atau Password salah'
            ], 401);
        }

        if (!Hash::check($request->password, $user->password)) {
            \Log::warning("Login failed: Password mismatch for email '{$email}'");
            return response()->json([
                'message' => 'Email atau Password salah'
            ], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }

    public function checkEmailRole(Request $request)
    {
        $request->validate(['email' => 'required|email']);
        $user = User::where('email', trim($request->email))->first();
        
        if (!$user) {
            return response()->json(['message' => 'Email tidak terdaftar.'], 404);
        }

        return response()->json(['role' => $user->role]);
    }

    public function resetPasswordRecovery(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'recovery_key' => 'required',
            'new_password' => 'required|min:6'
        ]);

        $user = User::where('email', trim($request->email))->first();
        if (!$user) {
            return response()->json(['message' => 'Email tidak ditemukan.'], 404);
        }

        if ($user->role !== 'owner') {
            return response()->json(['message' => 'Fitur ini hanya untuk Owner.'], 403);
        }

        $masterKey = \Illuminate\Support\Facades\DB::table('settings')->where('key', 'master_recovery_key')->value('value');
        
        if (empty($masterKey)) {
            return response()->json(['message' => 'Kode Brankas Pemulihan belum dikonfigurasi di Pengaturan.'], 400);
        }

        if ($request->recovery_key !== $masterKey) {
            return response()->json(['message' => 'Kode Brankas Rahasia salah!'], 401);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();

        return response()->json(['message' => 'Password berhasil direset. Silakan login dengan password baru.']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
