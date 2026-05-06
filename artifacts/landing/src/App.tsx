function App() {
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#ffffff", minHeight: "100vh", color: "#111827" }}>
      <nav style={{ borderBottom: "1px solid #e5e7eb", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#111827" }}>NovaTech</span>
        <div style={{ display: "flex", gap: "2rem", fontSize: "0.9rem", color: "#6b7280" }}>
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Products</a>
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Solutions</a>
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Pricing</a>
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Docs</a>
        </div>
        <button style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, padding: "0.5rem 1.2rem", fontSize: "0.9rem", cursor: "pointer" }}>
          Sign in
        </button>
      </nav>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "5rem 2rem", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "#eff6ff", color: "#2563eb", borderRadius: 999, padding: "0.3rem 1rem", fontSize: "0.8rem", fontWeight: 600, marginBottom: "1.5rem" }}>
          Now in public beta
        </div>
        <h1 style={{ fontSize: "3rem", fontWeight: 800, lineHeight: 1.2, color: "#111827", margin: "0 0 1.5rem" }}>
          Developer infrastructure<br />for modern teams
        </h1>
        <p style={{ fontSize: "1.15rem", color: "#6b7280", maxWidth: 560, margin: "0 auto 2.5rem", lineHeight: 1.6 }}>
          Build, deploy, and scale your applications with confidence. Simple APIs, zero operational overhead.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "0.75rem 1.8rem", fontSize: "1rem", fontWeight: 600, cursor: "pointer" }}>
            Get started free
          </button>
          <button style={{ background: "transparent", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, padding: "0.75rem 1.8rem", fontSize: "1rem", fontWeight: 600, cursor: "pointer" }}>
            View documentation →
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", marginTop: "5rem", textAlign: "left" }}>
          {[
            { icon: "⚡", title: "Blazing fast", desc: "Sub-10ms latency on all core operations with global edge deployment." },
            { icon: "🔒", title: "Secure by default", desc: "End-to-end encryption, SOC 2 compliant, and audit logs out of the box." },
            { icon: "📈", title: "Scales instantly", desc: "From zero to millions of requests without any configuration changes." },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ background: "#f9fafb", borderRadius: 12, padding: "1.5rem", border: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>{icon}</div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>{title}</h3>
              <p style={{ fontSize: "0.9rem", color: "#6b7280", lineHeight: 1.5, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer style={{ borderTop: "1px solid #e5e7eb", padding: "2rem", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>
        © {new Date().getFullYear()} NovaTech, Inc. All rights reserved.
      </footer>
    </div>
  );
}

export default App;
