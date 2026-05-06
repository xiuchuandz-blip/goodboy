function App() {
  const base = window.location.origin;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#0f172a", minHeight: "100vh", color: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ maxWidth: 640, width: "100%" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#f8fafc", margin: 0 }}>API Proxy</h1>
          <p style={{ color: "#94a3b8", marginTop: "0.5rem" }}>OpenAI 兼容接口中转站，直接配置使用即可。</p>
        </div>

        <div style={{ background: "#1e293b", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #334155" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 1rem" }}>接入配置</h2>
          <Row label="Base URL" value={`${base}/api/v1`} />
          <Row label="API Key" value="任意字符串（无需验证）" dim />
        </div>

        <div style={{ background: "#1e293b", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #334155" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 1rem" }}>示例（curl）</h2>
          <pre style={{ background: "#0f172a", borderRadius: 8, padding: "1rem", fontSize: "0.8rem", color: "#7dd3fc", overflowX: "auto", margin: 0 }}>{`curl ${base}/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer any-key" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`}</pre>
        </div>

        <div style={{ background: "#1e293b", borderRadius: 12, padding: "1.5rem", border: "1px solid #334155" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 1rem" }}>可用接口</h2>
          <Endpoint method="GET" path="/api/v1/models" desc="列出可用模型" />
          <Endpoint method="POST" path="/api/v1/chat/completions" desc="对话补全（支持流式）" />
          <Endpoint method="POST" path="/api/v1/embeddings" desc="文本向量化" />
        </div>

        <p style={{ color: "#475569", fontSize: "0.8rem", marginTop: "1.5rem", textAlign: "center" }}>
          所有请求均通过上游代理转发，真实密钥和地址对外不可见。
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid #334155" }}>
      <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>{label}</span>
      <span style={{ color: dim ? "#64748b" : "#7dd3fc", fontFamily: "monospace", fontSize: "0.85rem" }}>{value}</span>
    </div>
  );
}

function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  const color = method === "GET" ? "#4ade80" : "#f59e0b";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0", borderBottom: "1px solid #1e293b" }}>
      <span style={{ color, fontFamily: "monospace", fontSize: "0.75rem", fontWeight: 700, minWidth: 36 }}>{method}</span>
      <span style={{ color: "#e2e8f0", fontFamily: "monospace", fontSize: "0.85rem", flex: 1 }}>{path}</span>
      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>{desc}</span>
    </div>
  );
}

export default App;
