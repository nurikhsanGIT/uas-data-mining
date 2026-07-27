interface ProductHeaderProps {
  onAdd?: () => void;
}

export function ProductHeader({
  onAdd,
}: ProductHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Produk
        </h1>

        <p className="text-sm text-gray-500">
          Kelola seluruh produk Nikky Superstore
        </p>
      </div>

      <button
        onClick={onAdd}
        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
      >
        + Tambah Produk
      </button>
    </div>
  );
}
