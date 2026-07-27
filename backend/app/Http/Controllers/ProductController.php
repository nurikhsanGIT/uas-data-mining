<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductStock;
use App\Models\User;
use Illuminate\Http\Request;
use App\Helpers\AuditHelper;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $branchId = $request->branch_id;

        $query = Product::with([
            'stocks.branch'
        ]);

        if ($branchId) {
            $query->whereHas('stocks', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }

        $products = $query->get()->map(function($p){
    $p->image_url = $p->image ? asset('storage/'.$p->image) : null;
    return $p;
});
return $products;
    }

    public function expiring()
    {
        $products = Product::query()
            ->select('id', 'sku', 'name', 'image', 'expiry')
            ->whereNotNull('expiry')
            ->whereDate('expiry', '<=', now()->addDays(7))
            ->orderBy('expiry')
            ->limit(20)
            ->get()
            ->map(function($p){
                $p->image_url = $p->image ? asset('storage/'.$p->image) : null;
                return $p;
            });
        return $products;
    }

    public function store(Request $request)
    {
        $request->validate([
            'sku' => 'required|unique:products,sku',
            'name' => 'required',
            'branch_id' => 'required|exists:branches,id',
            'stock' => 'required|numeric|min:0',
        ], [
            'sku.unique' => 'SKU sudah digunakan',
            'sku.required' => 'SKU wajib diisi',
            'name.required' => 'Nama produk wajib diisi',
        ]);

        $branchId = $this->resolveBranchId($request);

        $imagePath = null;

        if ($request->hasFile('image')) {
            $imagePath = $request
                ->file('image')
                ->store('products', 'public');
        }

        $product = Product::create([
            'sku' => $request->sku,
            'name' => $request->name,
            'category' => $request->category,
            'price' => $request->price,
            'expiry' => $request->expiry,
            'image' => $imagePath,
        ]);

        ProductStock::create([
            'product_id' => $product->id,
            'branch_id' => $branchId,
            'stock' => $request->stock,
        ]);

        AuditHelper::log(
            $request->user_id,
            'CREATE',
            'PRODUCT',
            'Menambahkan produk ' . $product->name
        );

        return response()->json($product);
    }

    public function show(Product $product)
    {
        return $product;
    }

    public function update(Request $request, Product $product)
    {
        $branchId = $this->resolveBranchId($request);

        $imagePath = $product->image;

        if ($request->hasFile('image')) {
            $imagePath = $request
                ->file('image')
                ->store('products', 'public');
        }

        $product->update([
            'sku' => $request->sku,
            'name' => $request->name,
            'category' => $request->category,
            'price' => $request->price,
            'expiry' => $request->expiry,
            'image' => $imagePath,
        ]);

        ProductStock::updateOrCreate(
            [
                'product_id' => $product->id,
                'branch_id' => $branchId,
            ],
            [
                'stock' => $request->stock,
            ]
        );

        AuditHelper::log(
            $request->user_id,
            'UPDATE',
            'PRODUCT',
            'Mengubah produk ' . $product->name
        );

        return response()->json($product);
    }


    private function resolveBranchId(Request $request): int
    {
        $user = User::find($request->user_id);

        if ($user?->role === 'admin_gudang') {
            abort_if(
                ! $user->branch_id,
                422,
                'Admin gudang belum memiliki cabang.'
            );

            return (int) $user->branch_id;
        }

        return (int) $request->branch_id;
    }

    public function destroy(Product $product)
    {
        $hasSales = DB::table('sale_items')->where('product_id', $product->id)->exists();
        if ($hasSales) {
            return response()->json([
                'message' => 'Tidak dapat menghapus produk ini karena telah memiliki riwayat transaksi penjualan. Silakan biarkan produk tetap ada.'
            ], 422);
        }

        DB::table('transfer_stocks')
            ->where('product_id', $product->id)
            ->delete();

        DB::table('product_stocks')
            ->where('product_id', $product->id)
            ->delete();

        $product->delete();

        return response()->json([
            'message' => 'Produk berhasil dihapus'
        ]);
    }
}
