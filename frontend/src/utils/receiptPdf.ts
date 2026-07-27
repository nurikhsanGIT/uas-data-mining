import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateReceiptPDF = (sale: any) => {
  const doc = new jsPDF();

  // HEADER
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Nikky Superstore", 105, 20, {
    align: "center",
  });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  doc.text("Point of Sale System", 105, 28, { align: "center" });

  doc.line(15, 35, 195, 35);

  // INFO TRANSAKSI
  doc.setFontSize(10);

  doc.text(`Invoice : ${sale.invoice_number}`, 15, 45);

  doc.text(`Kasir : ${sale.user?.name ?? "-"}`, 15, 52);

  doc.text(
    `Tanggal : ${new Date(sale.created_at).toLocaleString("id-ID")}`,
    15,
    59,
  );

  // TABEL PRODUK
  autoTable(doc, {
    startY: 68,

    head: [["Produk", "Qty", "Harga", "Subtotal"]],

    body:
      sale.items?.map((item: any) => [
        item.product?.name,
        item.qty,
        new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(item.price),

        new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(item.qty * item.price),
      ]) ?? [],

    theme: "grid",

    headStyles: {
      fillColor: [37, 99, 235],
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;

  // TOTAL
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");

  doc.text("TOTAL", 15, finalY);

  doc.text(
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(sale.total),

    195,
    finalY,

    {
      align: "right",
    },
  );

  // FOOTER
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  doc.text("Terima kasih telah berbelanja", 105, finalY + 20, {
    align: "center",
  });

  doc.text("Nikky Superstore POS System", 105, finalY + 27, {
    align: "center",
  });

  doc.save(`${sale.invoice_number}.pdf`);
};

