<?php

namespace App\Http\Controllers\Api;

use App\Helpers\AuditHelper;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'role' => 'nullable|in:owner,kasir,admin_gudang,admin_keuangan',
        ]);

        $credentials = [
            'email' => $validated['email'],
            'password' => $validated['password'],
        ];

        if (! Auth::attempt($credentials)) {
            return response()->json([
                'success' => false,
                'message' => 'Email atau password salah',
            ], 401);
        }

        $user = Auth::user();

        if (isset($validated['role']) && $user->role !== $validated['role']) {
            Auth::logout();

            return response()->json([
                'success' => false,
                'message' => 'Role login tidak sesuai dengan akun ini',
            ], 403);
        }

        AuditHelper::log(
            $user->id,
            'LOGIN',
            'AUTH',
            'Login ke sistem'
        );

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->role,
                'branch_id' => $user->branch_id,
            ],
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user) {
            return response()->json([
                'success' => true,
                'message' => 'Jika email terdaftar, link reset password akan dikirim.',
            ]);
        }

        $token = Str::random(64);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => hash('sha256', $token),
                'created_at' => now(),
            ]
        );

        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/');
        $resetUrl = $frontendUrl . '/?reset_token=' . $token . '&email=' . urlencode($user->email);

        try {
            Mail::raw(
                "Halo {$user->name},\n\nKlik link berikut untuk mengatur ulang password Nikky Frozen POS:\n{$resetUrl}\n\nLink berlaku selama 60 menit.\n\nJika Anda tidak meminta reset password, abaikan pesan ini.",
                function ($message) use ($user) {
                    $message
                        ->to($user->email)
                        ->subject('Reset Password Nikky Frozen POS');
                }
            );
        } catch (\Throwable $e) {
            // On local development the reset URL is still returned below.
        }

        return response()->json([
            'success' => true,
            'message' => 'Link reset password sudah dibuat.',
            'reset_url' => $resetUrl,
        ]);
    }

    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $validated['email'])
            ->first();

        if (! $record) {
            return response()->json([
                'success' => false,
                'message' => 'Token reset tidak ditemukan.',
            ], 422);
        }

        if (now()->diffInMinutes($record->created_at) > 60) {
            DB::table('password_reset_tokens')
                ->where('email', $validated['email'])
                ->delete();

            return response()->json([
                'success' => false,
                'message' => 'Token reset sudah kedaluwarsa.',
            ], 422);
        }

        if (! hash_equals($record->token, hash('sha256', $validated['token']))) {
            return response()->json([
                'success' => false,
                'message' => 'Token reset tidak valid.',
            ], 422);
        }

        $user = User::where('email', $validated['email'])->first();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan.',
            ], 404);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        DB::table('password_reset_tokens')
            ->where('email', $validated['email'])
            ->delete();

        AuditHelper::log(
            $user->id,
            'RESET_PASSWORD',
            'AUTH',
            'Mengatur ulang password'
        );

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil diubah. Silakan login kembali.',
        ]);
    }
}