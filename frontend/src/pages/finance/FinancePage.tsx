import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import Swal from "sweetalert2";
import { AlertCircle, CheckCircle2, Lock, Users, Wallet, Building } from "lucide-react";

import {
  FinanceStats,
  FinanceChart,
  FinanceTransactionTable,
} from "../../components/finance";

interface Transaction {
  id: number;
  invoice: string;
  date: string;
  cashier: string;
  branch: string;
  items: number;
  payment: string;
  total: number;
}

export function FinancePage() {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const [activeTab, setActiveTab] = useState<"reports" | "settlement">("reports");

  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [period, setPeriod] = useState(30);

  // Settlement States
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [settlementData, setSettlementData] = useState<any>(null);

  const loadFinance = async () => {
    try {
      const params =
        user.role === "owner"
          ? {}
          : {
              branch_id: user.branch_id,
            };

      const salesRes = await api.get("/sales", {
        params,
      });

      const expenseRes = await api.get("/expenses", {
        params,
      });

      const salesData = salesRes.data;
      const expenseData = expenseRes.data;

      setSales(salesData);
      setExpenses(expenseData);

      const dynamicChart = [];

      for (let i = period - 1; i >= 0; i--) {
        const currentDate = new Date();

        currentDate.setDate(currentDate.getDate() - i);

        const dailySales = salesData.filter(
          (sale: any) =>
            new Date(sale.created_at).toDateString() ===
            currentDate.toDateString(),
        );

        const dailyExpenses = expenseData.filter(
          (expense: any) =>
            new Date(expense.created_at).toDateString() ===
            currentDate.toDateString(),
        );

        dynamicChart.push({
          name:
            period <= 7
              ? currentDate.toLocaleDateString("id-ID", {
                  weekday: "short",
                })
              : currentDate.toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "2-digit",
                }),

          income: dailySales.reduce(
            (sum: number, sale: any) => sum + Number(sale.total),
            0,
          ),

          expense: dailyExpenses.reduce(
            (sum: number, expense: any) => sum + Number(expense.amount),
            0,
          ),
        });
      }

      setChartData(dynamicChart);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadFinance();
  }, [period]);

  // Load branches
  useEffect(() => {
    const loadBranches = async () => {
      if (user.role === "owner") {
        try {
          const res = await api.get("/branches");
          setBranches(res.data);
          if (res.data.length > 0) {
            setSelectedBranch(String(res.data[0].id));
          }
        } catch (error) {
          console.error(error);
        }
      } else {
        setSelectedBranch(String(user.branch_id));
      }
    };
    loadBranches();
  }, []);

  const loadSettlementInfo = async () => {
    if (!selectedBranch) return;
    try {
      const res = await api.get(`/daily-settlements/today?branch_id=${selectedBranch}`);
      setSettlementData(res.data);
    } catch (error) {
      console.error("Gagal load info tutup buku:", error);
    }
  };

  useEffect(() => {
    loadSettlementInfo();
  }, [selectedBranch]);

  const handleCloseDay = async () => {
    const result = await Swal.fire({
      title: "Konfirmasi Tutup Buku?",
      text: "Setelah ditutup, penjualan baru untuk hari ini akan dikunci dan kasir tidak bisa membuat transaksi lagi.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Tutup Buku",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      await api.post("/daily-settlements/close", {
        branch_id: selectedBranch,
        user_id: user.id,
      });

      Swal.fire("Berhasil", "Tutup buku harian cabang berhasil diselesaikan!", "success");
      loadSettlementInfo();
    } catch (error: any) {
      Swal.fire("Gagal", error.response?.data?.message || "Terjadi kesalahan", "error");
    }
  };

  const filteredSales = sales.filter((sale) => {
    const saleDate = new Date(sale.created_at);

    const startDate = new Date();

    startDate.setDate(startDate.getDate() - period);

    return saleDate >= startDate;
  });

  const filteredExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.created_at);

    const startDate = new Date();

    startDate.setDate(startDate.getDate() - period);

    return expenseDate >= startDate;
  });

  const revenue = filteredSales.reduce(
    (sum, sale) => sum + Number(sale.total),
    0,
  );

  const expense = filteredExpenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );

  const profit = revenue - expense;

  const todayRevenue = filteredSales
    .filter(
      (sale) =>
        new Date(sale.created_at).toDateString() === new Date().toDateString(),
    )
    .reduce((sum, sale) => sum + Number(sale.total), 0);

  const totalTransactions = filteredSales.length;

  const avgTransaction =
    totalTransactions > 0 ? revenue / totalTransactions : 0;

  const transactions: Transaction[] = filteredSales.map((sale: any) => ({
    id: sale.id,

    invoice: sale.invoice_number || `INV-${sale.id}`,

    date: new Date(sale.created_at).toLocaleDateString("id-ID"),

    cashier: sale.user?.name ?? "-",

    branch: sale.branch?.name ?? "-",

    items: Number(sale.items_qty ?? 0),

    payment: sale.payment_method ?? "-",

    total: Number(sale.total),
  }));

  const currentHour = new Date().getHours();
  const canSettle = currentHour >= 21;

  // Hitung ekspektasi nominal rekap untuk settlement
  const getTodaySalesAmount = () => {
    return sales
      .filter((s) => {
        const isToday = new Date(s.created_at).toDateString() === new Date().toDateString();
        const isBranch = !selectedBranch || String(s.branch_id) === String(selectedBranch);
        return isToday && isBranch;
      })
      .reduce((sum, s) => sum + Number(s.total), 0);
  };

  const getTodayExpensesAmount = () => {
    return expenses
      .filter((e) => {
        const isToday = new Date(e.created_at).toDateString() === new Date().toDateString();
        const isBranch = !selectedBranch || String(e.branch_id) === String(selectedBranch);
        return isToday && isBranch;
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* TAB MENU */}
      <div className="flex border-b border-gray-100 bg-white rounded-2xl p-1.5 shadow-sm max-w-md">
        <button
          onClick={() => setActiveTab("reports")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
            activeTab === "reports"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          📈 Laporan Keuangan
        </button>
        <button
          onClick={() => setActiveTab("settlement")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
            activeTab === "settlement"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          🔒 Tutup Buku Harian
        </button>
      </div>

      {activeTab === "reports" ? (
        <div className="space-y-5">
          <FinanceStats
            revenue={revenue}
            expense={expense}
            profit={profit}
            todayRevenue={todayRevenue}
            avgTransaction={avgTransaction}
            totalTransactions={totalTransactions}
          />

          <FinanceChart data={chartData} period={period} setPeriod={setPeriod} />

          <FinanceTransactionTable transactions={transactions} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* BRANCH SELECTOR FOR OWNER */}
          {user.role === "owner" && branches.length > 0 && (
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Pemilihan Cabang</h3>
                  <p className="text-xs text-slate-400">Pilih cabang aktif untuk memantau status shift dan settlement harian.</p>
                </div>
              </div>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-700 min-w-[200px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* STATUS TUTUP BUKU */}
          {settlementData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* STATUS SUMMARY */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-800">Status Tutup Buku Harian</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Pantau status penutupan buku harian untuk cabang aktif.</p>
                  </div>

                  {settlementData.settlement ? (
                    <div className="flex items-center gap-4 bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20 text-green-900 p-5 rounded-2xl">
                      <div className="p-3 bg-green-500 text-white rounded-2xl shadow-md shadow-green-500/20">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-800">Tutup Buku Selesai</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Data penjualan untuk hari ini telah dikunci pada{" "}
                          <strong className="text-slate-700">
                            {new Date(settlementData.settlement.created_at).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })} WIB
                          </strong>.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 text-amber-900 p-5 rounded-2xl">
                      <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md shadow-amber-500/20">
                        <AlertCircle className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-800">Belum Tutup Buku</p>
                        <p className="text-xs text-slate-500 mt-0.5">Penjualan cabang masih aktif berjalan. Proses tutup buku dilakukan setelah pukul 21:00.</p>
                      </div>
                    </div>
                  )}

                  {/* KEUANGAN RECAP */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-3xl bg-gradient-to-br from-white to-slate-50 border border-slate-100 flex items-center gap-4 shadow-sm">
                      <div className="p-3.5 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">OMZET HARI INI</p>
                        <p className="text-2xl font-black text-slate-800 mt-0.5">Rp {getTodaySalesAmount().toLocaleString("id-ID")}</p>
                      </div>
                    </div>

                    <div className="p-5 rounded-3xl bg-gradient-to-br from-white to-slate-50 border border-slate-100 flex items-center gap-4 shadow-sm">
                      <div className="p-3.5 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-500/20">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">PENGELUARAN HARI INI</p>
                        <p className="text-2xl font-black text-slate-800 mt-0.5">Rp {getTodayExpensesAmount().toLocaleString("id-ID")}</p>
                      </div>
                    </div>
                  </div>

                  {/* ACTION TRIGGER BUTTON */}
                  {!settlementData.settlement && (
                    <div className="pt-2">
                      {canSettle ? (
                        <button
                          onClick={handleCloseDay}
                          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-indigo-500/35 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                        >
                          <Lock className="w-4 h-4" />
                          Lakukan Tutup Buku Sekarang
                        </button>
                      ) : (
                        <div className="p-4 bg-slate-50 border border-slate-200/60 text-slate-600 rounded-2xl flex items-center gap-3">
                          <div className="p-2 bg-slate-200 text-slate-600 rounded-lg">
                            <Lock className="w-4 h-4" />
                          </div>
                          <p className="text-xs font-semibold text-slate-500">
                            Tombol Tutup Buku Harian baru aktif <strong className="text-slate-800">setelah pukul 21:00</strong> untuk memastikan rekapitulasi data shift selesai dilakukan.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* SHIFTS RECAP TABLE */}
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-50">
                    <h3 className="font-black text-slate-800 text-lg">Rekap Shift Hari Ini</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Daftar sesi kerja kasir yang tercatat hari ini.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-400 font-bold text-xs uppercase tracking-wider">
                        <tr>
                          <th className="p-4">Shift</th>
                          <th className="p-4">Kasir</th>
                          <th className="p-4 text-right">Modal Awal</th>
                          <th className="p-4 text-right">Omzet</th>
                          <th className="p-4 text-right">Fisik Laci</th>
                          <th className="p-4 text-right">Selisih</th>
                          <th className="p-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {settlementData.shifts.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">Belum ada sesi shift kasir hari ini.</td>
                          </tr>
                        ) : (
                          settlementData.shifts.map((s: any) => {
                            const diff = s.actual_cash !== null ? s.actual_cash - (s.initial_cash + s.total_sales) : 0;
                            return (
                              <tr key={s.id} className="hover:bg-slate-50/50 transition">
                                <td className="p-4">
                                  <span className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg">
                                    Shift {s.shift_number}
                                  </span>
                                </td>
                                <td className="p-4 font-bold text-slate-800">{s.user?.name}</td>
                                <td className="p-4 text-right font-medium text-slate-600">Rp {s.initial_cash.toLocaleString("id-ID")}</td>
                                <td className="p-4 text-right text-blue-600 font-bold">Rp {s.total_sales.toLocaleString("id-ID")}</td>
                                <td className="p-4 text-right font-extrabold text-slate-800">
                                  {s.actual_cash !== null ? `Rp ${s.actual_cash.toLocaleString("id-ID")}` : "-"}
                                </td>
                                <td className="p-4 text-right">
                                  {s.actual_cash !== null ? (
                                    diff < 0 ? (
                                      <span className="px-2.5 py-1 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-full">
                                        Minus Rp {Math.abs(diff).toLocaleString("id-ID")}
                                      </span>
                                    ) : diff > 0 ? (
                                      <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold rounded-full">
                                        Surplus Rp {diff.toLocaleString("id-ID")}
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-bold rounded-full">
                                        Pas
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-slate-400 font-semibold">-</span>
                                  )}
                                </td>
                                <td className="p-4 text-center">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                    s.status === "open"
                                      ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                                      : "bg-slate-100 text-slate-500 border-slate-200"
                                  }`}>
                                    {s.status === "open" ? "Aktif" : "Selesai"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* INFORMATION SIDEBAR */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-[32px] shadow-xl border border-slate-800 space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>

                  <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                    <Users className="w-6 h-6 text-indigo-300" />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xl font-black tracking-tight">Panduan Sesi Shift</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Sistem operasional kasir Nikky Superstore dirancang dengan 2 shift mandiri untuk memastikan keakuratan kas masuk.
                    </p>
                  </div>

                  <div className="space-y-4 pt-2 border-t border-white/5">
                    <div className="flex gap-3 items-start">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                      <p className="text-xs text-slate-300 leading-relaxed"><strong className="text-white">Buka Shift:</strong> Kasir wajib memasukkan modal awal laci sebelum memulai penjualan.</p>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                      <p className="text-xs text-slate-300 leading-relaxed"><strong className="text-white">Tutup Shift:</strong> Kasir wajib menghitung dan memasukkan uang fisik laci di akhir shift.</p>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                      <p className="text-xs text-slate-300 leading-relaxed"><strong className="text-white">Tutup Buku:</strong> Admin Keuangan / Owner menutup hari kerja setelah jam 21:00. Seluruh transaksi terkunci.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

