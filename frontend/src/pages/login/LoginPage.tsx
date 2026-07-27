import { api } from "../../lib/api";
import { useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  Snowflake,
} from "lucide-react";

interface LoginProps {
  onLogin: () => void;
}

type LoginMode = "login" | "forgot" | "reset";

export default function Login({ onLogin }: LoginProps) {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const resetToken = query.get("reset_token") || "";
  const resetEmail = query.get("email") || "";

  const [mode, setMode] = useState<LoginMode>(resetToken ? "reset" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(resetEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const response = await api.post("/login", {
        email,
        password,
      });

      sessionStorage.setItem("user", JSON.stringify(response.data.user));

      await Swal.fire({
        icon: "success",
        title: "Login Berhasil",
        text: `Login sebagai ${response.data.user.role}`,
        timer: 1500,
        showConfirmButton: false,
      });

      onLogin();
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Login Gagal",
        text: error?.response?.data?.message || "Email atau Password salah",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Swal.fire({
        icon: "warning",
        title: "Email wajib diisi",
        text: "Masukkan email akun terlebih dahulu.",
      });
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/forgot-password", {
        email,
      });

      await Swal.fire({
        icon: "success",
        title: "Link Reset Dibuat",
        html: `
          <p style="margin-bottom: 12px;">${response.data.message}</p>
          ${
            response.data.reset_url
              ? `<a href="${response.data.reset_url}" style="color:#2563eb;word-break:break-all;">${response.data.reset_url}</a>`
              : ""
          }
        `,
      });
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error?.response?.data?.message || "Tidak bisa membuat link reset.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (password.length < 6) {
      Swal.fire({
        icon: "warning",
        title: "Password terlalu pendek",
        text: "Password minimal 6 karakter.",
      });
      return;
    }

    if (password !== confirmPassword) {
      Swal.fire({
        icon: "warning",
        title: "Konfirmasi tidak sama",
        text: "Password baru dan konfirmasi password harus sama.",
      });
      return;
    }

    try {
      setLoading(true);

      await api.post("/reset-password", {
        email,
        token: resetToken,
        password,
        password_confirmation: confirmPassword,
      });

      await Swal.fire({
        icon: "success",
        title: "Password Berhasil Diubah",
        text: "Silakan login dengan password baru.",
      });

      window.history.replaceState({}, "", window.location.pathname);
      setMode("login");
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Gagal Reset Password",
        text: error?.response?.data?.message || "Link reset tidak valid.",
      });
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === "forgot"
      ? "Lupa Password"
      : mode === "reset"
        ? "Reset Password"
        : "Selamat Datang";

  const description =
    mode === "forgot"
      ? "Masukkan email akun untuk membuat link reset password"
      : mode === "reset"
        ? "Buat password baru untuk akun Anda"
        : "Masuk ke sistem POS Nikky Superstore";

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-950 text-white">
        <div className="absolute inset-0 opacity-10">
          <Snowflake className="absolute top-20 left-10 w-24 h-24" />
          <Snowflake className="absolute bottom-20 left-16 w-32 h-32" />
          <Snowflake className="absolute top-60 right-20 w-20 h-20" />
          <Snowflake className="absolute bottom-32 right-12 w-28 h-28" />
        </div>

        <div className="relative z-10 flex flex-col items-center w-full px-16 pt-24">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
              <Snowflake size={34} />
            </div>

            <div>
              <h1 className="text-5xl font-bold">Nikky Superstore</h1>
              <p className="text-blue-100 text-xl">Point of Sale System</p>
            </div>
          </div>

          <div className="w-72 h-72 rounded-3xl border border-white/20 bg-white/10 backdrop-blur flex flex-col items-center justify-center mb-10">
            <Snowflake className="w-24 h-24" />
            <p className="mt-6 text-xl font-semibold">Produk Frozen Berkualitas</p>
          </div>

          <h2 className="text-5xl font-bold text-center leading-tight max-w-3xl">
            Kelola Bisnis Frozen Food
            <br />
            dengan Lebih Mudah
          </h2>

          <p className="text-blue-100 text-center max-w-2xl mt-5 text-lg">
            Sistem POS terpadu multi-cabang untuk penjualan, stok, kadaluarsa,
            dan laporan keuangan secara real-time.
          </p>

          <div className="mt-10 space-y-4 text-lg">
            <div className="flex items-center gap-3">
              <CheckCircle2 />
              <span>Multi-cabang & multi-role support</span>
            </div>

            <div className="flex items-center gap-3">
              <CheckCircle2 />
              <span>Monitoring kadaluarsa otomatis</span>
            </div>

            <div className="flex items-center gap-3">
              <CheckCircle2 />
              <span>Laporan keuangan & jurnal real-time</span>
            </div>

            <div className="flex items-center gap-3">
              <CheckCircle2 />
              <span>Mode offline dengan auto-sinkronisasi</span>
            </div>
          </div>

          <p className="mt-12 text-blue-200 text-sm">
            Copyright 2026 Nikky Superstore. All rights reserved.
          </p>
        </div>
      </div>

      <div className="bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-xl rounded-[32px] shadow-xl p-10">
          {mode !== "login" && (
            <button
              type="button"
              onClick={() => {
                window.history.replaceState({}, "", window.location.pathname);
                setMode("login");
              }}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 mb-6"
            >
              <ArrowLeft size={16} />
              Kembali ke login
            </button>
          )}

          <h2 className="text-4xl font-bold text-slate-900">{title}</h2>

          <p className="text-slate-500 mt-2">{description}</p>



          <div className="mt-8">
            <label className="block text-sm font-semibold text-slate-600 mb-2">
              EMAIL
            </label>

            <div className="relative">
              <Mail className="absolute left-4 top-4 text-slate-400" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={mode === "reset" && Boolean(resetEmail)}
                placeholder="nama@email.com"
                className="w-full h-14 pl-12 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <div className="mt-6">
              <div className="flex justify-between mb-2">
                <label className="text-sm font-semibold text-slate-600">
                  {mode === "reset" ? "PASSWORD BARU" : "PASSWORD"}
                </label>

                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-blue-600 text-sm hover:text-blue-700"
                  >
                    Lupa password?
                  </button>
                )}
              </div>

              <div className="relative">
                <LockKeyhole className="absolute left-4 top-4 text-slate-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "reset" ? "Minimal 6 karakter" : "â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"}
                  className="w-full h-14 pl-12 pr-12 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button
                  type="button"
                  className="absolute right-4 top-4 text-slate-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          )}

          {mode === "reset" && (
            <div className="mt-6">
              <label className="block text-sm font-semibold text-slate-600 mb-2">
                KONFIRMASI PASSWORD
              </label>

              <div className="relative">
                <KeyRound className="absolute left-4 top-4 text-slate-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  className="w-full h-14 pl-12 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={
              mode === "forgot"
                ? handleForgotPassword
                : mode === "reset"
                  ? handleResetPassword
                  : handleLogin
            }
            disabled={loading}
            className="w-full mt-8 h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg transition disabled:bg-gray-400"
          >
            {loading
              ? "Memproses..."
              : mode === "forgot"
                ? "Kirim Link Reset"
                : mode === "reset"
                  ? "Simpan Password Baru"
                  : "Masuk ke Sistem"}
          </button>

          {mode === "forgot" && (
            <p className="text-center text-sm text-slate-400 mt-6">
              Pada mode lokal, link reset juga akan muncul di popup setelah dikirim.
            </p>
          )}

          {mode === "login" && (
            <p className="text-center text-sm text-slate-400 mt-6">
              Dengan masuk, Anda menyetujui
              <span className="text-blue-600"> Syarat & Ketentuan </span>
              Nikky Superstore
            </p>
          )}

          <p className="text-center text-sm text-slate-400 mt-8">
            Nikky Superstore POS v2.4.1 - Copyright 2026
          </p>
        </div>
      </div>
    </div>
  );
}
