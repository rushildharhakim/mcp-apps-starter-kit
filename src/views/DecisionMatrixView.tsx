import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import * as s from "./shared/styles";

function heatmapColor(score: number, max: number): string {
  const ratio = max > 0 ? score / max : 0;
  const r = Math.round(255 - ratio * 90);
  const g = Math.round(255 - ratio * 60);
  const b = 255;
  return `rgb(${r}, ${g}, ${b})`;
}

function DecisionMatrixView() {
  const [data, setData] = useState<any>(null);

  useApp({
    appInfo: { name: "DecisionMatrix", version: "1.0.0" },
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

  if (!data) return <div style={{ padding: 24, color: "#6b7280" }}>Loading decision matrix...</div>;

  const { title, options, criteria } = data;

  // Find max score for heatmap scaling
  const maxScore = Math.max(
    ...criteria.map((c: any) =>
      Math.max(...options.map((o: any) => o.scores?.[c.name] || 0))
    )
  );

  // Calculate weighted totals
  const totals = options.map((opt: any) => {
    const total = criteria.reduce(
      (sum: number, c: any) => sum + (opt.scores?.[c.name] || 0) * (c.weight || 1),
      0
    );
    return { name: opt.name, total };
  });

  const maxTotal = Math.max(...totals.map((t: any) => t.total));
  const bestIdx = totals.findIndex((t: any) => t.total === maxTotal);

  return (
    <div style={s.card}>
      <div style={s.header("#475569", "#374151")}>
        <h2 style={s.headerTitle}>{title}</h2>
        <p style={s.headerSubtitle}>
          {options.length} options · {criteria.length} criteria
        </p>
      </div>
      <div style={s.body}>
        {/* Matrix table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...s.tableHeader, minWidth: 120 }}>Criteria</th>
                <th style={{ ...s.tableHeader, width: 60, textAlign: "center" }}>Weight</th>
                {options.map((opt: any, i: number) => (
                  <th
                    key={i}
                    style={{
                      ...s.tableHeader,
                      textAlign: "center",
                      background: i === bestIdx ? "#eff6ff" : undefined,
                    }}
                  >
                    {opt.name}
                    {i === bestIdx && (
                      <div>
                        <span style={{ ...s.badge("#fbbf24", "#78350f"), fontSize: 8, marginTop: 4 }}>
                          Best Pick
                        </span>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {criteria.map((c: any, ci: number) => (
                <tr key={ci}>
                  <td style={{ ...s.tableCell, fontWeight: 500 }}>{c.name}</td>
                  <td style={{ ...s.tableCell, textAlign: "center" }}>
                    <span style={s.chipBadge("#f3f4f6", "#374151")}>×{c.weight}</span>
                  </td>
                  {options.map((opt: any, oi: number) => {
                    const score = opt.scores?.[c.name] || 0;
                    return (
                      <td
                        key={oi}
                        style={{
                          ...s.tableCell,
                          textAlign: "center",
                          fontWeight: 600,
                          fontSize: 15,
                          background: heatmapColor(score, maxScore),
                        }}
                      >
                        {score}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Totals row */}
              <tr>
                <td
                  style={{
                    ...s.tableCell,
                    fontWeight: 700,
                    fontSize: 14,
                    borderTop: "2px solid #374151",
                  }}
                >
                  Weighted Total
                </td>
                <td style={{ ...s.tableCell, borderTop: "2px solid #374151" }} />
                {totals.map((t: any, i: number) => (
                  <td
                    key={i}
                    style={{
                      ...s.tableCell,
                      textAlign: "center",
                      fontWeight: 700,
                      fontSize: 18,
                      color: i === bestIdx ? "#2563eb" : "#111827",
                      borderTop: "2px solid #374151",
                      background: i === bestIdx ? "#eff6ff" : undefined,
                    }}
                  >
                    {t.total.toFixed(1)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bar chart of final scores */}
        <p style={{ ...s.sectionTitle, marginTop: 24 }}>Final Scores</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={totals} margin={{ left: 10, right: 10 }}>
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Bar
              dataKey="total"
              fill="#475569"
              radius={[6, 6, 0, 0]}
              label={{ position: "top", fontSize: 13, fontWeight: 700 }}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Recommendation */}
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: "#eff6ff",
            borderRadius: 8,
            border: "1px solid #bfdbfe",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 24 }}>🏆</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1e40af" }}>
              Recommendation: {options[bestIdx]?.name}
            </div>
            <div style={{ fontSize: 12, color: "#3b82f6" }}>
              Scored {totals[bestIdx]?.total.toFixed(1)} out of a possible{" "}
              {(criteria.reduce((s: number, c: any) => s + (c.weight || 1), 0) * maxScore).toFixed(1)}{" "}
              weighted points
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<DecisionMatrixView />);
