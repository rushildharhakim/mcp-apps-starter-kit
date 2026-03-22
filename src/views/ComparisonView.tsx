import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import * as s from "./shared/styles";

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span style={{ fontSize: 16, color: "#f59e0b", letterSpacing: 2 }}>
      {"★".repeat(full)}
      {half && "½"}
      {"☆".repeat(empty)}
      <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 4 }}>{rating.toFixed(1)}</span>
    </span>
  );
}

function ComparisonView() {
  const [data, setData] = useState<any>(null);

  useApp({
    appInfo: { name: "Comparison", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = (result: any) => {
        if (result.structuredContent) {
          setData(result.structuredContent);
        } else {
          const text = result.content?.find((c: any) => c.type === "text")?.text;
          if (text) setData(JSON.parse(text));
        }
      };
    },
  });

  if (!data) return <div style={{ padding: 24, color: "#6b7280" }}>Loading comparison...</div>;

  const { title, options } = data;

  // Find best option by rating
  const bestIdx = options.reduce(
    (best: number, opt: any, i: number) =>
      (opt.rating || 0) > (options[best]?.rating || 0) ? i : best,
    0
  );

  return (
    <div style={s.card}>
      <div style={s.header("#7c3aed", "#4f46e5")}>
        <h2 style={s.headerTitle}>{title}</h2>
        <p style={s.headerSubtitle}>Comparing {options.length} options</p>
      </div>
      <div style={s.body}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${options.length}, 1fr)`,
            gap: 16,
          }}
        >
          {options.map((opt: any, i: number) => (
            <div
              key={i}
              style={{
                border: i === bestIdx ? "2px solid #7c3aed" : "1px solid #e5e7eb",
                borderRadius: 10,
                overflow: "hidden",
                position: "relative" as const,
              }}
            >
              {/* Option header */}
              <div
                style={{
                  background: i === bestIdx ? "#7c3aed" : "#f9fafb",
                  padding: "12px 16px",
                  color: i === bestIdx ? "#fff" : "#111827",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700 }}>{opt.name}</div>
                {i === bestIdx && (
                  <span
                    style={{
                      ...s.badge("#fbbf24", "#78350f"),
                      position: "absolute" as const,
                      top: 8,
                      right: 8,
                      fontSize: 9,
                    }}
                  >
                    Best Pick
                  </span>
                )}
              </div>

              <div style={{ padding: 16 }}>
                {/* Rating */}
                {opt.rating != null && (
                  <div style={{ marginBottom: 12 }}>
                    <StarRating rating={opt.rating} />
                  </div>
                )}

                {/* Price */}
                {opt.price && (
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>
                      {opt.price}
                    </span>
                  </div>
                )}

                {/* Pros */}
                {opt.pros?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ ...s.sectionTitle, color: "#059669" }}>Pros</p>
                    {opt.pros.map((p: string, j: number) => (
                      <div
                        key={j}
                        style={{ fontSize: 13, marginBottom: 4, display: "flex", gap: 6 }}
                      >
                        <span style={{ color: "#059669" }}>✓</span>
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cons */}
                {opt.cons?.length > 0 && (
                  <div>
                    <p style={{ ...s.sectionTitle, color: "#dc2626" }}>Cons</p>
                    {opt.cons.map((c: string, j: number) => (
                      <div
                        key={j}
                        style={{ fontSize: 13, marginBottom: 4, display: "flex", gap: 6 }}
                      >
                        <span style={{ color: "#dc2626" }}>✗</span>
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<ComparisonView />);
