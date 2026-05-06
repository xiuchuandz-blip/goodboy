import { useState } from "react";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setError("Invalid email or password. Please try again.");
    }, 1200);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <div style={{ width: 44, height: 44, background: "#2563eb", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>NovaTech</h1>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "0.25rem" }}>Sign in to your account</p>
      </div>

      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", padding: "2rem", width: "100%", maxWidth: 380 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ width: "100%", padding: "0.65rem 0.9rem", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.95rem", outline: "none", boxSizing: "border-box", color: "#111827" }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#374151" }}>Password</label>
              <a href="#" style={{ fontSize: "0.8rem", color: "#2563eb", textDecoration: "none" }}>Forgot password?</a>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: "100%", padding: "0.65rem 0.9rem", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.95rem", outline: "none", boxSizing: "border-box", color: "#111827" }}
            />
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "0.65rem 0.9rem", marginBottom: "1rem", color: "#dc2626", fontSize: "0.85rem" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", background: loading ? "#93c5fd" : "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "0.75rem", fontSize: "1rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", transition: "background 0.2s" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.85rem", color: "#64748b" }}>
          Don't have an account?{" "}
          <a href="#" style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>Contact sales</a>
        </p>
      </div>

      <p style={{ marginTop: "2rem", color: "#94a3b8", fontSize: "0.78rem" }}>
        © {new Date().getFullYear()} NovaTech, Inc. · Privacy · Terms
      </p>
    </div>
  );
}
