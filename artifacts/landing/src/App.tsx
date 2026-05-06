import maskImage from "@assets/图片_1778033535107.png";

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        padding: "1rem",
      }}
    >
      <img
        src={maskImage}
        alt=""
        style={{
          maxWidth: "100%",
          maxHeight: "85vh",
          width: "auto",
          height: "auto",
          objectFit: "contain",
          boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
        }}
      />
      <p
        style={{
          marginTop: "1.5rem",
          color: "#fff",
          fontSize: "1.5rem",
          fontWeight: 500,
          textAlign: "center",
          letterSpacing: "0.02em",
          textShadow: "0 2px 8px rgba(0,0,0,0.8)",
        }}
      >
        Did u like what u see
      </p>
    </div>
  );
}
