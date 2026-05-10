/*Login: id=wizzy | password=wizzycodes
───────────────────────────────────────────────────────────────────────── */

const { useState, useEffect, useRef, useCallback } = React;
const API = "http://127.0.0.1:8000";

/* ── Credentials (Final Year Project — lightweight auth) ─────────────────── */
const VALID_ID  = "wizzy";
const VALID_PWD = "wizzycodes";
const SESSION_KEY = "assettrack_auth";

/* ── Login Page ──────────────────────────────────────────────────────────── */
function LoginPage({ onLogin }) {
  const [userId,   setUserId]   = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);

  const handleLogin = () => {
    if (!userId.trim() || !password.trim()) {
      setError("Please enter both User ID and Password.");
      return;
    }
    setLoading(true);
    setError("");
    /* Simulated slight delay for UX feel */
    setTimeout(() => {
      if (userId.trim() === VALID_ID && password === VALID_PWD) {
        onLogin();
      } else {
        setError("Invalid User ID or Password. Please try again.");
        setLoading(false);
      }
    }, 600);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="login-overlay">
      <div className="login-bg-grid"></div>

      {/* Decorative blobs */}
      <div className="login-blob login-blob-1"></div>
      <div className="login-blob login-blob-2"></div>

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">📡</div>
          <div>
            <div className="login-logo-text">AssetTrack Pro</div>
            <div className="login-logo-sub">Asset Management System</div>
          </div>
        </div>

        <div className="login-divider"></div>

        <div className="login-heading">Welcome Back</div>
        <div className="login-subheading">Sign in to access the dashboard</div>

        {/* User ID */}
        <div className="login-field">
          <label className="login-label">User ID</label>
          <div className="login-input-wrap">
            <span className="login-input-icon">◈</span>
            <input
              className={"login-input" + (error ? " login-input-error" : "")}
              type="text"
              placeholder="Enter your user ID"
              value={userId}
              onChange={e => { setUserId(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
        </div>

        {/* Password */}
        <div className="login-field">
          <label className="login-label">Password</label>
          <div className="login-input-wrap">
            <span className="login-input-icon">🔒</span>
            <input
              className={"login-input login-input-padded" + (error ? " login-input-error" : "")}
              type={showPwd ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
            />
            <button
              className="login-eye-btn"
              onClick={() => setShowPwd(p => !p)}
              title={showPwd ? "Hide" : "Show"}
            >
              {showPwd ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="login-error">
            <span>⚠</span> {error}
          </div>
        )}

        {/* Submit */}
        <button
          className="login-btn"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading
            ? <span className="login-spinner">⏳ Signing in…</span>
            : "Sign In →"
          }
        </button>

        <div className="login-footer">
         &nbsp; AssetTrack Pro v2.0
        </div>
      </div>
    </div>
  );
}


/* ── Helpers ─────────────────────────────────────────────────────────────── */
async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ── Toast system ────────────────────────────────────────────────────────── */
function ToastContainer({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={"toast " + t.type}>
          <span>{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ── QR View Modal ───────────────────────────────────────────────────────── */
function QrModal({ asset, onClose }) {
  if (!asset) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{asset.name}</div>
        <div className="modal-sub">QR Code — scan to identify asset</div>
        {asset.qr_code
          ? <img src={asset.qr_code} alt="QR Code" />
          : <div style={{ padding: "40px", color: "var(--muted)" }}>No QR available</div>
        }
        <div className="modal-value">{asset.value}</div>
        <div className="modal-actions">
          {asset.qr_code && (
            <a href={asset.qr_code} download={`qr-${asset.id}.png`} className="btn btn-success">
              ↓ Download
            </a>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ── Stat Card ───────────────────────────────────────────────────────────── */
function StatCard({ label, value, icon, color, trend }) {
  return (
    <div className={"stat-card " + color}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-icon">{icon}</div>
      <div className="stat-trend">{trend}</div>
    </div>
  );
}

/* ── Donut Chart ─────────────────────────────────────────────────────────── */
function StatusChart({ statusCounts }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);
  const COLORS    = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  useEffect(() => {
    if (!canvasRef.current) return;
    const labels = Object.keys(statusCounts);
    const data   = Object.values(statusCounts);
    if (!labels.length) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: COLORS,
          borderColor: "#0d1420",
          borderWidth: 3,
          hoverOffset: 6,
        }]
      },
      options: {
        responsive: false, cutout: "72%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#111826", borderColor: "#1c2638", borderWidth: 1,
            titleColor: "#e2e8f0", bodyColor: "#94a3b8", padding: 10,
          }
        }
      }
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [statusCounts]);

  const entries = Object.entries(statusCounts);
  return (
    <div className="chart-wrap">
      <div className="chart-canvas-wrap">
        <canvas ref={canvasRef} width="200" height="200"></canvas>
      </div>
      <div className="chart-legend">
        {entries.length === 0
          ? <div style={{ color: "var(--muted)", fontSize: "13px" }}>No data yet</div>
          : entries.map(([label, val], i) => (
              <div key={label} className="legend-item">
                <div className="legend-dot" style={{ background: COLORS[i % COLORS.length] }}></div>
                <span className="legend-label">{label}</span>
                <span className="legend-val">{val}</span>
              </div>
            ))
        }
      </div>
    </div>
  );
}

/* ── Add Asset Form ──────────────────────────────────────────────────────── */
function AddAssetForm({ onAdded, showToast }) {
  const [form, setForm]     = useState({ name: "", value: "", location: "classroom", status: "Active" });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.value.trim()) {
      showToast("error", "Name and Value are required.");
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch("/add_asset", { method: "POST", body: JSON.stringify(form) });
      showToast("success", `Asset "${data.asset.name}" added!`);
      setForm({ name: "", value: "", location: "classroom", status: "Active" });
      onAdded();
    } catch {
      showToast("error", "Backend unreachable. Is the server running on port 8000?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Asset Name</label>
        <input className="form-input" placeholder="e.g. Dell Laptop XPS15"
          value={form.name} onChange={e => set("name", e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Asset Value / Tag ID</label>
        <input className="form-input" placeholder="e.g. ASSET-2024-001"
          value={form.value} onChange={e => set("value", e.target.value)} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Location</label>
          <select className="form-select" value={form.location} onChange={e => set("location", e.target.value)}>
            {["classroom", "storeroom", "Lab", "office", "Entry"].map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={e => set("status", e.target.value)}>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
      </div>
      <button className="btn btn-primary"
        style={{ width: "100%", justifyContent: "center", marginTop: "4px" }}
        onClick={handleSubmit} disabled={loading}>
        {loading ? "⏳ Adding..." : "＋ Add Asset"}
      </button>
    </div>
  );
}

/* ── Asset Table ─────────────────────────────────────────────────────────── */
function AssetTable({ assets, loading, error, onDelete, onQr }) {
  if (error) return <div className="error-banner">⚠ {error}</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {["ID", "NAME", "VALUE / TAG", "LOCATION", "STATUS", "QR CODE", "ACTION"].map(h => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? <tr className="loading-row"><td colSpan="7">Loading assets…</td></tr>
            : assets.length === 0
              ? <tr><td colSpan="7">
                  <div className="empty-state">
                    <div className="empty-icon">📦</div>
                    <div className="empty-text">No assets found</div>
                    <div className="empty-sub">Add your first asset using the form</div>
                  </div>
                </td></tr>
              : assets.map(a => (
                  <tr key={a.id}>
                    <td><span className="id-badge">#{a.id}</span></td>
                    <td style={{ fontWeight: 500 }}>{a.name}</td>
                    <td style={{ fontFamily: "'DM Mono',monospace", fontSize: "12px", color: "var(--accent2)" }}>{a.value}</td>
                    <td style={{ color: "var(--muted)" }}>{a.location}</td>
                    <td>
                      <span className={"status-pill " + (a.status === "Active" ? "active" : "inactive")}>
                        <span className="dot"></span>{a.status}
                      </span>
                    </td>
                    <td>
                      {a.qr_code
                        ? <img className="qr-thumb" src={a.qr_code} alt="QR" onClick={() => onQr(a)} title="Click to enlarge" />
                        : <div className="no-qr">⬜</div>
                      }
                    </td>
                    <td>
                      <button className="btn btn-danger"
                        style={{ padding: "5px 10px", fontSize: "11px" }}
                        onClick={() => onDelete(a.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
          }
        </tbody>
      </table>
    </div>
  );
}

/* ── QR Scanner View ─────────────────────────────────────────────────────── */
function ScannerView({ showToast }) {
  const [scanning, setScanning]   = useState(false);
  const [result,   setResult]     = useState(null);   // { found, asset, decoded }
  const [loading,  setLoading]    = useState(false);
  const scannerRef = useRef(null);
  const html5Ref   = useRef(null);

  const stopScanner = useCallback(() => {
    if (html5Ref.current) {
      html5Ref.current.stop().catch(() => {});
      html5Ref.current = null;
    }
    setScanning(false);
    // Small delay so html5-qrcode has time to release the camera
    setTimeout(() => {}, 300);
  }, []);

  const handleDecode = useCallback(async (decodedText) => {
    stopScanner();
    setLoading(true);
    try {
      const data = await apiFetch("/scan", {
        method: "POST",
        body: JSON.stringify({ value: decodedText }),
      });
      setResult({ ...data, decoded: decodedText });
      if (data.found) {
        showToast("success", `Asset found: ${data.asset.name}`);
      } else {
        showToast("error", "No matching asset for this QR code.");
      }
    } catch {
      showToast("error", "Backend unreachable. Is the server running?");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [stopScanner, showToast]);

  const startScanner = useCallback(() => {
    if (!window.Html5Qrcode) {
      showToast("error", "QR scanner library not loaded. Check your internet connection.");
      return;
    }
    setResult(null);
    setScanning(true);
  }, [showToast]);

  /* Initialise Html5Qrcode after scanning=true and DOM is ready */
  useEffect(() => {
    if (!scanning) return;

    // Fix 1: Defer by one tick so React has flushed the #qr-reader div to the DOM
    const tid = setTimeout(() => {
      const el = document.getElementById("qr-reader");
      if (!el) return;

      const scanner = new Html5Qrcode("qr-reader");
      html5Ref.current = scanner;

      // Fix 4: Try rear camera first, fall back to any available camera
      const tryStart = (constraints) =>
        scanner.start(
          constraints,
          { fps: 10, qrbox: { width: 220, height: 220 } },
          handleDecode,
          () => {}  /* suppress per-frame errors */
        );

      tryStart({ facingMode: "environment" })
        .catch(() => tryStart({ facingMode: "user" }))
        .catch(err => {
          console.error(err);
          showToast("error", "Camera access denied or unavailable.");
          html5Ref.current = null;
          setScanning(false);
        });
    }, 100);

    // Fix 2: Only stop if still running (avoid double-stop after handleDecode already stopped it)
    return () => {
      clearTimeout(tid);
      if (html5Ref.current) {
        html5Ref.current.stop().catch(() => {});
        html5Ref.current = null;
      }
    };
  }, [scanning, handleDecode, showToast]);

  /* Clean up when component unmounts */
  useEffect(() => () => stopScanner(), [stopScanner]);

  const reset = () => {
    setResult(null);
    setScanning(false);
  };

  return (
    <div>
      <div className="card scanner-container">
        <div className="card-header">
          <div>
            <div className="card-title">QR Code Scanner</div>
            <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "3px" }}>
              Point your camera at any asset QR code to look it up instantly
            </div>
          </div>
          <span className="card-tag">Camera</span>
        </div>

        {/* Camera box */}
        <div className="scanner-box" style={{ minHeight: "280px" }}>
          {scanning
            ? (
              <div>
                {/* html5-qrcode mounts the video feed into this div */}
                <div id="qr-reader" style={{ width: "100%" }}></div>
                <div className="scanner-overlay">
                  <div className="scan-frame">
                    <span></span>
                    <div className="scan-laser"></div>
                  </div>
                </div>
              </div>
            )
            : (
              <div className="scanner-idle">
                {loading
                  ? <div>
                      <div className="empty-icon" style={{ animationName: "pulse", animationDuration: "1s", animationIterationCount: "infinite" }}>🔍</div>
                      <div>Looking up asset…</div>
                    </div>
                  : <div>
                      <div className="idle-icon">📷</div>
                      <div>Camera is off</div>
                      <div style={{ fontSize: "12px", marginTop: "4px" }}>Click Start Scan to activate</div>
                    </div>
                }
              </div>
            )
          }
        </div>

        {/* Controls */}
        <div className="scan-controls" style={{ marginTop: "16px" }}>
          {!scanning && !loading && (
            <button className="btn btn-primary" onClick={startScanner}>
              📷 Start Scan
            </button>
          )}
          {scanning && (
            <button className="btn btn-danger" onClick={stopScanner}>
              ✕ Stop Camera
            </button>
          )}
          {result && (
            <button className="btn btn-ghost" onClick={reset}>
              ↺ Scan Another
            </button>
          )}
        </div>

        {/* Scan Result */}
        {result && (
          <div className={"scan-result-card " + (result.found ? "found" : "not-found")} style={{ marginTop: "20px" }}>
            <div className="scan-result-header">
              <span>{result.found ? "✅" : "❌"}</span>
              <span style={{ color: result.found ? "var(--success)" : "var(--danger)" }}>
                {result.found ? "Asset Found" : "No Match"}
              </span>
            </div>

            {result.found
              ? (
                <div>
                  <div className="scan-result-grid">
                    <div className="scan-field">
                      <label>Name</label>
                      <span>{result.asset.name}</span>
                    </div>
                    <div className="scan-field">
                      <label>Status</label>
                      <span>
                        <span className={"status-pill " + (result.asset.status === "Active" ? "active" : "inactive")}>
                          <span className="dot"></span>{result.asset.status}
                        </span>
                      </span>
                    </div>
                    <div className="scan-field">
                      <label>Location</label>
                      <span>{result.asset.location}</span>
                    </div>
                    <div className="scan-field">
                      <label>Asset ID</label>
                      <span><span className="id-badge">#{result.asset.id}</span></span>
                    </div>
                  </div>
                  <div className="scan-decoded">
                    <span style={{ color: "var(--muted)", fontSize: "10px", letterSpacing: "1px", fontFamily: "'DM Mono',monospace" }}>DECODED VALUE → </span>
                    {result.decoded}
                  </div>
                </div>
              )
              : (
                <div>
                  <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "8px" }}>
                    This QR code does not match any registered asset.
                  </div>
                  <div className="scan-decoded">{result.decoded}</div>
                </div>
              )
            }
          </div>
        )}

        <div className="info-box">
          <strong>ℹ How it works</strong><br />
          The scanner uses your device camera via the html5-qrcode library.
          When a QR code is detected, the decoded value is sent to
          <code> POST /scan </code> on the backend which looks up the matching asset by its tag ID.
          Works best with the QR codes generated by this system.
        </div>
      </div>
    </div>
  );
}

/* ── Main App ────────────────────────────────────────────────────────────── */
function App({ onLogout }) {
  const [view,    setView]    = useState("dashboard");
  const [assets,  setAssets]  = useState([]);
  const [stats,   setStats]   = useState({ total: 0, status_counts: {}, location_counts: {} });
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [assetError,    setAssetError]    = useState(null);
  const [toasts,  setToasts]  = useState([]);
  const [qrAsset, setQrAsset] = useState(null);
  const [now,     setNow]     = useState(new Date());
  const [assetsView, setAssetsView] = useState("table");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const showToast = useCallback((type, msg) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const loadData = useCallback(async () => {
    setLoadingAssets(true);
    setAssetError(null);
    try {
      const [ad, sd] = await Promise.all([
        apiFetch("/assets"),
        apiFetch("/stats"),
      ]);
      setAssets(ad.assets || []);
      setStats(sd);
    } catch {
      setAssetError("Could not connect to backend. Make sure FastAPI is running on port 8000.");
      setAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this asset?")) return;
    try {
      await apiFetch(`/asset/${id}`, { method: "DELETE" });
      showToast("success", "Asset deleted.");
      loadData();
    } catch {
      showToast("error", "Failed to delete asset.");
    }
  };

  const navItems = [
    { id: "dashboard", icon: "◈", label: "Dashboard"  },
    { id: "assets",    icon: "⬡", label: "Assets"     },
    { id: "add",       icon: "＋", label: "Add Asset"  },
    { id: "scanner",   icon: "▦", label: "QR Scanner" },
    { id: "analytics", icon: "◉", label: "Analytics"  },
  ];

  const activeLabel = navItems.find(n => n.id === view)?.label || "";

  return (
    <div className="app">
      <ToastContainer toasts={toasts} />
      {qrAsset && <QrModal asset={qrAsset} onClose={() => setQrAsset(null)} />}

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon">📡</div>
            <div>
              <div className="logo-text">AssetTrack</div>
              <div className="logo-sub">Pro v2.0</div>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map(n => (
            <div key={n.id}
              className={"nav-item" + (view === n.id ? " active" : "")}
              onClick={() => setView(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="status-badge">
            <div className="status-dot"></div>
            API Connected
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main">
        <header className="topbar">
          <div>
            <div className="page-title">{activeLabel}</div>
            <div className="page-sub">AssetTrack</div>
          </div>
          <div className="topbar-actions">
            <div className="time-badge">{now.toLocaleTimeString()}</div>
            <div className="user-badge">👤 wizzy</div>
            <button className="btn btn-ghost" onClick={loadData}>↻ Refresh</button>
            <button className="btn btn-logout" onClick={onLogout} title="Sign out">⏻ Logout</button>
            <button className="btn btn-primary" onClick={() => setView("add")}>＋ New Asset</button>
          </div>
        </header>

        <div className="content">

          {/* ── DASHBOARD ── */}
          {view === "dashboard" && (
            <div>
              {assetError && <div className="error-banner">⚠ {assetError}</div>}
              <div className="stats-row">
                <StatCard label="Total Assets"  value={stats.total}                            icon="📦" color="blue"  trend="All registered" />
                <StatCard label="Active"         value={stats.status_counts["Active"]   || 0}  icon="✅" color="green" trend={<span className="trend-up">Operational</span>} />
                <StatCard label="Inactive"        value={stats.status_counts["Inactive"] || 0} icon="⛔" color="red"   trend="Offline" />
                <StatCard label="Locations"      value={Object.keys(stats.location_counts || {}).length} icon="📍" color="amber" trend="Unique sites" />
              </div>

              <div className="mid-row">
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Status Distribution</span>
                    <span className="card-tag">Live Chart</span>
                  </div>
                  <StatusChart statusCounts={stats.status_counts || {}} />
                </div>
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Quick Add</span>
                    <span className="card-tag">FastAPI</span>
                  </div>
                  <AddAssetForm onAdded={loadData} showToast={showToast} />
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">Recent Assets</span>
                  <button className="btn btn-ghost"
                    style={{ padding: "5px 12px", fontSize: "12px" }}
                    onClick={() => setView("assets")}>
                    View All →
                  </button>
                </div>
                <AssetTable assets={assets.slice(0, 5)} loading={loadingAssets}
                  error={assetError} onDelete={handleDelete} onQr={setQrAsset} />
              </div>
            </div>
          )}

          {/* ── ASSETS ── */}
          {view === "assets" && (
            <div>
              {assetError && <div className="error-banner">⚠ {assetError}</div>}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">All Assets</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "3px" }}>
                      {assets.length} asset{assets.length !== 1 ? "s" : ""} registered
                    </div>
                  </div>
                  <div className="topbar-actions">
                    <div className="view-tabs">
                      <button className={"view-tab" + (assetsView === "table" ? " active" : "")}
                        onClick={() => setAssetsView("table")}>Table</button>
                      <button className={"view-tab" + (assetsView === "grid"  ? " active" : "")}
                        onClick={() => setAssetsView("grid")}>Grid</button>
                    </div>
                  </div>
                </div>

                {assetsView === "table"
                  ? <AssetTable assets={assets} loading={loadingAssets}
                      error={assetError} onDelete={handleDelete} onQr={setQrAsset} />
                  : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: "14px" }}>
                      {assets.map(a => (
                        <div key={a.id} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
                          {a.qr_code
                            ? <img src={a.qr_code} alt="QR" style={{ width: "80px", height: "80px", background: "white", borderRadius: "6px", padding: "4px", cursor: "pointer" }} onClick={() => setQrAsset(a)} />
                            : <div style={{ width: "80px", height: "80px", background: "var(--border)", borderRadius: "6px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>📦</div>
                          }
                          <div style={{ fontWeight: 600, fontSize: "13px", marginTop: "10px" }}>{a.name}</div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: "var(--accent2)", marginTop: "3px" }}>{a.value}</div>
                          <div style={{ marginTop: "8px" }}>
                            <span className={"status-pill " + (a.status === "Active" ? "active" : "inactive")}>
                              <span className="dot"></span>{a.status}
                            </span>
                          </div>
                          <button className="btn btn-danger"
                            style={{ marginTop: "10px", width: "100%", justifyContent: "center", padding: "5px", fontSize: "11px" }}
                            onClick={() => handleDelete(a.id)}>
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            </div>
          )}

          {/* ── ADD ASSET ── */}
          {view === "add" && (
            <div style={{ maxWidth: "500px" }}>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Register New Asset</span>
                  <span className="card-tag">POST /add_asset</span>
                </div>
                <AddAssetForm
                  onAdded={() => { loadData(); setView("assets"); }}
                  showToast={showToast} />
              </div>
              <div className="info-box">
                <strong>ℹ About QR Codes</strong><br />
                A QR code image is generated from the Asset Value / Tag ID and stored in
                <code> backend/qr_codes/</code>. Click any QR thumbnail in the asset list to enlarge it,
                or use the <strong>QR Scanner</strong> page to scan it back with your camera.
              </div>
            </div>
          )}

          {/* ── QR SCANNER ── */}
          {view === "scanner" && (
            <ScannerView showToast={showToast} />
          )}

          {/* ── ANALYTICS ── */}
          {view === "analytics" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Status Breakdown</span>
                    <span className="card-tag">Donut Chart</span>
                  </div>
                  <StatusChart statusCounts={stats.status_counts || {}} />
                </div>
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Location Summary</span>
                    <span className="card-tag">Breakdown</span>
                  </div>
                  <div style={{ padding: "8px 0" }}>
                    {Object.entries(stats.location_counts || {}).length === 0
                      ? <div style={{ color: "var(--muted)", fontSize: "13px", textAlign: "center", padding: "30px" }}>No location data</div>
                      : Object.entries(stats.location_counts || {}).map(([loc, cnt]) => {
                          const pct = stats.total > 0 ? Math.round((cnt / stats.total) * 100) : 0;
                          return (
                            <div key={loc} style={{ marginBottom: "14px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "5px" }}>
                                <span>{loc}</span>
                                <span style={{ fontFamily: "'DM Mono',monospace", color: "var(--muted)" }}>{cnt} ({pct}%)</span>
                              </div>
                              <div className="loc-bar-track">
                                <div className="loc-bar-fill" style={{ width: pct + "%" }}></div>
                              </div>
                            </div>
                          );
                        })
                    }
                  </div>
                </div>
              </div>
              <div className="stats-row">
                <StatCard label="Total Assets"    value={stats.total}                             icon="📦" color="blue"  trend="All time" />
                <StatCard label="Active"           value={stats.status_counts["Active"]   || 0}   icon="✅" color="green" trend="Running" />
                <StatCard label="Inactive"          value={stats.status_counts["Inactive"] || 0}  icon="⛔" color="red"   trend="Offline" />
                <StatCard label="Unique Locations" value={Object.keys(stats.location_counts || {}).length} icon="📍" color="amber" trend="Sites" />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}


/* ── Root — auth gate lives here, outside App so hooks are never skipped ── */
function Root() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "1"
  );

  const handleLogin = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setAuthed(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  };

  if (!authed) return <LoginPage onLogin={handleLogin} />;
  return <App onLogout={handleLogout} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
