"use client";

export default function DebugEnvPage() {
  return (
    <div style={{ padding: "2rem", fontFamily: "monospace" }}>
      <h1>Environment Variables Debug</h1>
      <div style={{ marginTop: "2rem" }}>
        <h2>NEXT_PUBLIC_API_URL:</h2>
        <pre style={{ background: "#f4f4f4", padding: "1rem" }}>
          {process.env.NEXT_PUBLIC_API_URL || "❌ undefined"}
        </pre>
      </div>
      <div style={{ marginTop: "2rem" }}>
        <h2>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:</h2>
        <pre style={{ background: "#f4f4f4", padding: "1rem" }}>
          {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 
            ? `✅ ${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.substring(0, 10)}...` 
            : "❌ undefined"}
        </pre>
      </div>
      <div style={{ marginTop: "2rem" }}>
        <h2>Full process.env (NEXT_PUBLIC_* only):</h2>
        <pre style={{ background: "#f4f4f4", padding: "1rem", fontSize: "12px" }}>
          {JSON.stringify(
            Object.keys(process.env)
              .filter(key => key.startsWith('NEXT_PUBLIC_'))
              .reduce((obj, key) => {
                obj[key] = process.env[key];
                return obj;
              }, {} as any),
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
