import streamlit as st
import time
import os
import pandas as pd
from graph.workflow import agent_graph
from utils.evaluator import ResponseEvaluator
from rag.loader import DocumentLoader
from rag.splitter import DocumentSplitter
from rag.vector_store import VectorStoreManager
from utils.config import DOCUMENTS_DIR, CHROMA_DB_DIR
from utils.data_loader import SuperstoreDataLoader
import logging

# ─── Page Config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Nikky Superstore AI",
    page_icon="🛒",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ─── Global CSS ───────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

/* ── Reset ── */
*, html, body, [class*="css"] {
    font-family: 'Inter', sans-serif !important;
    box-sizing: border-box;
}

/* ── App background ── */
.stApp { background: #f8fafc; color: #1e293b; }
.stAppHeader { background: transparent !important; }

/* ── Hide Streamlit chrome ── */
#MainMenu, footer, header { visibility: hidden; }
[data-testid="stToolbar"] { display: none; }

/* ── Sidebar ── */
[data-testid="stSidebar"] {
    background: #ffffff !important;
    border-right: 1px solid #e2e8f0 !important;
    padding-top: 0 !important;
}
[data-testid="stSidebar"] > div:first-child { padding-top: 0 !important; }
section[data-testid="stSidebar"] * { color: #475569 !important; }

/* ── Chat input ── */
.stChatInput textarea {
    background: #ffffff !important;
    border: 1px solid #e2e8f0 !important;
    color: #1e293b !important;
    border-radius: 12px !important;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06) !important;
}
.stChatInput textarea:focus {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.1) !important;
}

/* ── Tabs ── */
.stTabs [data-baseweb="tab-list"] {
    background: transparent !important;
    gap: 2px;
    border-bottom: 2px solid #e2e8f0;
}
.stTabs [data-baseweb="tab"] {
    background: transparent !important;
    color: #94a3b8 !important;
    border-radius: 6px 6px 0 0 !important;
    font-size: 0.82rem !important;
    font-weight: 500 !important;
    padding: 8px 14px !important;
}
.stTabs [aria-selected="true"] {
    background: transparent !important;
    color: #2563eb !important;
    border-bottom: 2px solid #2563eb !important;
}

/* ── Dataframe ── */
.stDataFrame { border-radius: 10px !important; }
[data-testid="stDataFrame"] {
    background: #ffffff;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
}

/* ── Buttons ── */
.stButton > button {
    background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
    color: white !important;
    border: none !important;
    border-radius: 10px !important;
    font-weight: 600 !important;
    font-size: 0.82rem !important;
    padding: 10px 16px !important;
    transition: all 0.2s !important;
    box-shadow: 0 2px 8px rgba(37,99,235,0.25) !important;
}
.stButton > button:hover {
    transform: translateY(-1px) !important;
    box-shadow: 0 4px 16px rgba(37,99,235,0.4) !important;
}

/* ── SIDEBAR CUSTOM ── */
.sb-brand {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    padding: 22px 16px 18px;
    margin-bottom: 12px;
}
.sb-brand-name {
    font-size: 1.05rem !important;
    font-weight: 700 !important;
    color: #ffffff !important;
    margin: 0;
}
.sb-brand-tag {
    font-size: 0.68rem !important;
    color: rgba(255,255,255,0.65) !important;
    margin: 4px 0 0 0;
    letter-spacing: 0.08em;
    font-weight: 500 !important;
}
.sb-stat {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 14px;
    margin: 0 12px 8px;
}
.sb-stat-label {
    font-size: 0.67rem !important;
    font-weight: 600 !important;
    color: #94a3b8 !important;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin: 0;
}
.sb-stat-val {
    font-size: 1.2rem !important;
    font-weight: 700 !important;
    color: #1e40af !important;
    margin: 3px 0 0 0;
    line-height: 1.2;
}
.sb-stat-sub {
    font-size: 0.68rem !important;
    color: #94a3b8 !important;
    margin: 2px 0 0 0;
}
.sb-section {
    padding: 8px 16px 4px;
    font-size: 0.67rem !important;
    font-weight: 700 !important;
    color: #94a3b8 !important;
    text-transform: uppercase;
    letter-spacing: 0.1em;
}
.sb-file {
    margin: 0 12px 4px;
    padding: 7px 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    font-size: 0.78rem !important;
    color: #64748b !important;
    display: flex;
    align-items: center;
    gap: 6px;
}
.sb-divider {
    height: 1px;
    background: #e2e8f0;
    margin: 12px 12px;
}

/* ── PAGE HEADER ── */
.page-hdr {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 24px 0 18px 0;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 22px;
}
.page-hdr-icon {
    width: 46px;
    height: 46px;
    background: linear-gradient(135deg, #2563eb, #7c3aed);
    border-radius: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(37,99,235,0.3);
}
.page-hdr-title {
    font-size: 1.3rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
}
.page-hdr-sub {
    font-size: 0.8rem;
    color: #94a3b8;
    margin: 3px 0 0 0;
}

/* ── CHAT ── */
.chat-area {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px 4px;
}
.chat-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 70px 24px;
    text-align: center;
    gap: 8px;
}
.chat-empty-icon {
    width: 52px;
    height: 52px;
    background: #eff6ff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    margin: 0 auto 6px;
    border: 1px solid #bfdbfe;
}
.chat-empty-text {
    font-size: 0.9rem;
    color: #64748b;
    margin: 0;
    font-weight: 600;
}
.chat-empty-hint {
    font-size: 0.78rem;
    color: #94a3b8;
    margin: 0;
    line-height: 1.7;
}
.msg-user-wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.msg-bot-wrap  { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; }
.msg-label {
    font-size: 0.66rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0 4px;
}
.msg-label-u { color: #2563eb; }
.msg-label-b { color: #059669; }
.msg-user {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    border-radius: 16px 16px 4px 16px;
    padding: 12px 16px;
    color: #ffffff;
    font-size: 0.9rem;
    line-height: 1.65;
    max-width: 86%;
    word-wrap: break-word;
    box-shadow: 0 2px 8px rgba(37,99,235,0.2);
}
.msg-bot {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 4px 16px 16px 16px;
    padding: 12px 16px;
    color: #334155;
    font-size: 0.9rem;
    line-height: 1.65;
    max-width: 92%;
    word-wrap: break-word;
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}
.msg-bot b, .msg-bot strong { color: #0f172a; }
.msg-bot ul, .msg-bot ol { padding-left: 18px; margin: 6px 0; }
.msg-bot li { margin-bottom: 3px; }

/* ── PANEL LABELS ── */
.panel-label {
    font-size: 0.67rem;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 10px;
}

/* ── STAT CARDS ── */
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
.stat-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.stat-card-label {
    font-size: 0.67rem;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0;
}
.stat-card-val {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e40af;
    margin: 5px 0 0 0;
    line-height: 1.1;
}
.chart-title {
    font-size: 0.78rem;
    font-weight: 600;
    color: #6b7280;
    margin: 14px 0 6px 0;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}
</style>
""", unsafe_allow_html=True)

# ─── Session State ─────────────────────────────────────────────────────────────
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []
if "last_state" not in st.session_state:
    st.session_state.last_state = {}
if "processing_query" not in st.session_state:
    st.session_state.processing_query = None

# ─── Load data (cached) ────────────────────────────────────────────────────────
fin = SuperstoreDataLoader.get_finance_summary()

# ─── SIDEBAR ──────────────────────────────────────────────────────────────────
with st.sidebar:
    # Brand header
    st.markdown("""
    <div class="sb-brand">
        <p class="sb-brand-name">🛒 Nikky Superstore</p>
        <p class="sb-brand-tag">AI BUSINESS ASSISTANT</p>
    </div>
    """, unsafe_allow_html=True)

    # Stats
    if fin:
        st.markdown("<p class='sb-section'>Ringkasan Dataset</p>", unsafe_allow_html=True)
        st.markdown(f"""
        <div class="sb-stat">
            <p class="sb-stat-label">Total Omzet</p>
            <p class="sb-stat-val">${fin.get('total_sales',0)/1e6:.2f}M</p>
            <p class="sb-stat-sub">dari {fin.get('total_orders',0):,} transaksi</p>
        </div>
        <div class="sb-stat">
            <p class="sb-stat-label">Total Profit</p>
            <p class="sb-stat-val">${fin.get('total_profit',0)/1e3:.1f}K</p>
            <p class="sb-stat-sub">margin {fin.get('total_profit',0)/max(fin.get('total_sales',1),1)*100:.1f}%</p>
        </div>
        <div class="sb-stat">
            <p class="sb-stat-label">Pelanggan Unik</p>
            <p class="sb-stat-val">{fin.get('total_customers',0):,}</p>
            <p class="sb-stat-sub">rata-rata diskon {fin.get('avg_discount',0):.1f}%</p>
        </div>
        """, unsafe_allow_html=True)

    # Dokumen
    st.markdown("<div class='sb-divider'></div>", unsafe_allow_html=True)
    st.markdown("<p class='sb-section'>Dokumen Referensi</p>", unsafe_allow_html=True)
    if os.path.exists(DOCUMENTS_DIR):
        files = [f for f in os.listdir(DOCUMENTS_DIR) if not f.startswith(".")]
        for f in files:
            st.markdown(f"<div class='sb-file'>📄 {f}</div>", unsafe_allow_html=True)

    st.markdown("<div class='sb-divider'></div>", unsafe_allow_html=True)

    if st.button("🔄 Perbarui Basis Pengetahuan", use_container_width=True):
        with st.spinner("Memperbarui..."):
            loader = DocumentLoader()
            docs = loader.load_directory(DOCUMENTS_DIR)
            splitter = DocumentSplitter(chunk_size=500, chunk_overlap=50)
            chunks = splitter.split_documents(docs)
            vm = VectorStoreManager()
            vm.reset_store()
            vm.add_documents(chunks)
            st.success("Selesai!")

    st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)

    if st.button("🗑️ Hapus Riwayat Chat", use_container_width=True):
        st.session_state.chat_history = []
        st.session_state.last_state = {}
        st.rerun()

# ─── PAGE HEADER ──────────────────────────────────────────────────────────────
st.markdown("""
<div class="page-hdr">
    <div class="page-hdr-icon">🛒</div>
    <div>
        <p class="page-hdr-title">Nikky Superstore Assistant</p>
        <p class="page-hdr-sub">Tanyakan tentang produk, penjualan, keuangan, atau layanan pelanggan</p>
    </div>
</div>
""", unsafe_allow_html=True)

# ─── LAYOUT ───────────────────────────────────────────────────────────────────
col_chat, col_dash = st.columns([1.15, 0.85], gap="large")

# ─── CHAT PANEL ───────────────────────────────────────────────────────────────
with col_chat:
    st.markdown("<p class='panel-label'>Percakapan</p>", unsafe_allow_html=True)

    # Chat history area
    chat_box = st.container(height=440, border=False)
    with chat_box:
        if not st.session_state.chat_history:
            st.markdown("""
            <div class="chat-empty">
                <div class="chat-empty-icon">💬</div>
                <p class="chat-empty-text">Mulai percakapan</p>
                <p class="chat-empty-hint">
                    Contoh pertanyaan:<br>
                    "produk terlaris bulan ini"<br>
                    "total omzet dan profit"<br>
                    "kebijakan refund"
                </p>
            </div>
            """, unsafe_allow_html=True)
        else:
            msgs_html = '<div class="chat-area">'
            for chat in st.session_state.chat_history:
                if chat["role"] == "user":
                    msgs_html += f"""
                    <div class="msg-user-wrap">
                        <span class="msg-label msg-label-u">Anda</span>
                        <div class="msg-user">{chat["text"]}</div>
                    </div>"""
                else:
                    text = chat["text"].replace("\n", "<br>")
                    msgs_html += f"""
                    <div class="msg-bot-wrap">
                        <span class="msg-label msg-label-b">Assistant</span>
                        <div class="msg-bot">{text}</div>
                    </div>"""
            msgs_html += "</div>"
            st.markdown(msgs_html, unsafe_allow_html=True)

    # Chat input
    if user_query := st.chat_input("Tanyakan sesuatu..."):
        st.session_state.chat_history.append({"role": "user", "text": user_query})
        st.session_state.processing_query = user_query
        st.rerun()
        
    if st.session_state.get("processing_query"):
        with st.spinner("Memproses..."):
            query = st.session_state.processing_query
            start_time = time.time()
            state_input = {
                "user_query": query,
                "user_id": "user",
                "session_id": "session",
                "intent": "",
                "tasks": [],
                "sql_results": [],
                "rag_results": [],
                "tool_results": [],
                "agent_outputs": [],
                "findings": "",
                "recommendations": "",
                "confidence": 1.0,
                "need_replan": False,
                "retry_count": 0,
                "final_answer": ""
            }
            try:
                result_state = agent_graph.invoke(state_input)
                st.session_state.last_state = result_state
            except Exception as e:
                logging.error(f"Workflow error: {e}")
                result_state = {}
                st.session_state.last_state = {}
            
            end_time = time.time()
            response_time = end_time - start_time

        ans = result_state.get("final_answer", "Maaf, tidak dapat memproses pertanyaan tersebut saat ini.")
        
        # Ekstrak nama agen yang bekerja
        agent_badges_html = ""
        tasks_run = result_state.get("tasks", [])
        if tasks_run:
            agents = list(set([t.get("agent", "Unknown").capitalize() for t in tasks_run]))
            badges = "".join([f'<span style="background-color:#dbeafe; color:#1e40af; padding:3px 10px; border-radius:12px; font-size:0.7rem; font-weight:bold; margin-right:5px; border:1px solid #bfdbfe;">🤖 {a} Agent</span>' for a in agents])
            agent_badges_html = f'<div style="margin-bottom:10px;">{badges}</div>'
        
        # Ekstraksi RAG context untuk evaluasi halusinasi
        rag_context = ""
        if result_state.get("rag_results"):
            contexts = []
            for r in result_state["rag_results"]:
                if isinstance(r, dict) and "content" in r:
                    contexts.append(r["content"])
                elif isinstance(r, dict) and "page_content" in r:
                    contexts.append(r["page_content"])
                else:
                    contexts.append(str(r))
            rag_context = " ".join(contexts)
        elif result_state.get("findings"):
            rag_context = result_state.get("findings")
        
        # Evaluasi
        eval_metrics = ResponseEvaluator.evaluate(query, ans, rag_context, response_time)
        
        sources_html = ", ".join(eval_metrics['sources_used']) if eval_metrics['sources_used'] else "Tidak ada (Pengetahuan Umum)"
        metrics_html = f'''
<br><br>
<div style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #e2e8f0; margin-top:8px; font-size:0.85rem;">
    <b style="color:#1e40af;">📊 Metrik Evaluasi Model:</b><br>
    <table style="width:100%; border:none; margin-top:6px;">
        <tr><td style="width:150px; border:none; padding:2px 0;">🎯 <b>Akurasi</b></td><td style="border:none; padding:2px 0;">: {eval_metrics['accuracy']}%</td></tr>
        <tr><td style="border:none; padding:2px 0;">📏 <b>Efektivitas</b></td><td style="border:none; padding:2px 0;">: {eval_metrics['effectiveness']}%</td></tr>
        <tr><td style="border:none; padding:2px 0;">⚡ <b>Kecepatan</b></td><td style="border:none; padding:2px 0;">: {eval_metrics['efficiency_seconds']} detik <span style="color:gray;">({eval_metrics['efficiency_rating']})</span></td></tr>
        <tr><td style="border:none; padding:2px 0;">🧠 <b>Risiko Halusinasi</b></td><td style="border:none; padding:2px 0;">: {eval_metrics['hallucination_rating']}</td></tr>
        <tr><td style="border:none; padding:2px 0; vertical-align:top;">📚 <b>Sumber Data</b></td><td style="border:none; padding:2px 0;">: {sources_html}</td></tr>
    </table>
</div>
'''
        final_ans = agent_badges_html + ans + metrics_html

        st.session_state.chat_history.append({"role": "assistant", "text": final_ans})
        st.session_state.processing_query = None
        st.rerun()

# ─── DASHBOARD PANEL ──────────────────────────────────────────────────────────
with col_dash:
    st.markdown("<p class='panel-label'>Data & Insight</p>", unsafe_allow_html=True)

    tab1, tab2, tab3 = st.tabs(["📦  Produk", "📈  Penjualan", "⭐  Kepuasan"])

    # ── Tab Produk ──
    with tab1:
        top_df = SuperstoreDataLoader.get_top_products(top_n=10)
        if not top_df.empty:
            disp = top_df[["Product_Name", "Category", "Total_Sales", "Total_Quantity"]].copy()
            disp.columns = ["Produk", "Kategori", "Penjualan ($)", "Qty"]
            disp["Penjualan ($)"] = disp["Penjualan ($)"].apply(lambda x: f"${x:,.0f}")
            st.dataframe(disp, use_container_width=True, hide_index=True, height=380)

    # ── Tab Penjualan ──
    with tab2:
        if fin:
            st.markdown(f"""
            <div class="stat-grid">
                <div class="stat-card">
                    <p class="stat-card-label">Total Omzet</p>
                    <p class="stat-card-val">${fin.get('total_sales',0)/1e6:.2f}M</p>
                </div>
                <div class="stat-card">
                    <p class="stat-card-label">Total Profit</p>
                    <p class="stat-card-val">${fin.get('total_profit',0)/1e3:.1f}K</p>
                </div>
                <div class="stat-card">
                    <p class="stat-card-label">Unit Terjual</p>
                    <p class="stat-card-val">{fin.get('total_quantity',0):,}</p>
                </div>
                <div class="stat-card">
                    <p class="stat-card-label">Rata Diskon</p>
                    <p class="stat-card-val">{fin.get('avg_discount',0):.1f}%</p>
                </div>
            </div>
            """, unsafe_allow_html=True)

        by_cat = SuperstoreDataLoader.get_finance_by_category()
        if not by_cat.empty:
            st.markdown("<p class='chart-title'>Omzet per Kategori</p>", unsafe_allow_html=True)
            st.bar_chart(by_cat.set_index("Category")["Total_Sales"], height=160, color="#3b82f6")

        by_reg = SuperstoreDataLoader.get_sales_by_region()
        if not by_reg.empty:
            st.markdown("<p class='chart-title'>Per Region</p>", unsafe_allow_html=True)
            rd = by_reg[["Region", "Total_Sales", "Total_Profit"]].copy()
            rd.columns = ["Region", "Penjualan ($)", "Profit ($)"]
            rd["Penjualan ($)"] = rd["Penjualan ($)"].apply(lambda x: f"${x:,.0f}")
            rd["Profit ($)"] = rd["Profit ($)"].apply(lambda x: f"${x:,.0f}")
            st.dataframe(rd, use_container_width=True, hide_index=True, height=175)

    # ── Tab Kepuasan ──
    with tab3:
        csat = SuperstoreDataLoader.get_csat_summary()
        if csat:
            st.markdown(f"""
            <div class="stat-grid">
                <div class="stat-card">
                    <p class="stat-card-label">Avg CSAT</p>
                    <p class="stat-card-val">{csat.get('avg_csat',0):.2f}<span style="font-size:0.7rem;color:#374151"> /5</span></p>
                </div>
                <div class="stat-card">
                    <p class="stat-card-label">Total Kasus</p>
                    <p class="stat-card-val">{csat.get('total_complaints',0)/1e3:.1f}K</p>
                </div>
            </div>
            """, unsafe_allow_html=True)

            dist = csat.get("csat_distribution", {})
            if dist:
                st.markdown("<p class='chart-title'>Distribusi Skor CSAT</p>", unsafe_allow_html=True)
                dist_df = pd.DataFrame.from_dict(
                    {str(k): v for k, v in sorted(dist.items())},
                    orient="index", columns=["Jumlah"]
                )
                st.bar_chart(dist_df, height=160, color="#10b981")

        complaints = SuperstoreDataLoader.get_complaints_by_category(top_n=5)
        if not complaints.empty:
            st.markdown("<p class='chart-title'>Top Kategori Komplain</p>", unsafe_allow_html=True)
            cd = complaints[["category", "Total", "Avg_CSAT"]].copy()
            cd.columns = ["Kategori", "Jumlah", "CSAT"]
            cd["CSAT"] = cd["CSAT"].round(2)
            st.dataframe(cd, use_container_width=True, hide_index=True, height=210)
