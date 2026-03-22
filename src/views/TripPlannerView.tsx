import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import * as s from "./shared/styles";

function TripPlannerView() {
  const [data, setData] = useState<any>(null);

  useApp({
    appInfo: { name: "TripPlanner", version: "1.0.0" },
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

  if (!data) return <div style={{ padding: 24, color: "#6b7280" }}>Loading itinerary...</div>;

  const { title, total_budget, itinerary } = data;

  // Calculate totals
  const totalSpent = itinerary.reduce(
    (sum: number, day: any) =>
      sum +
      (day.activities || []).reduce((ds: number, a: any) => ds + (a.cost || 0), 0),
    0
  );
  const budgetPct = total_budget ? (totalSpent / total_budget) * 100 : 0;

  return (
    <div style={s.card}>
      <div style={s.header("#ea580c", "#d97706")}>
        <h2 style={s.headerTitle}>{title}</h2>
        <p style={s.headerSubtitle}>
          {itinerary.length} days
          {total_budget ? ` · Budget: ${s.fmt(total_budget)}` : ""}
        </p>
      </div>
      <div style={s.body}>
        {/* Budget bar */}
        {total_budget && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Trip Budget</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: budgetPct > 100 ? "#dc2626" : "#059669",
                }}
              >
                {s.fmt(totalSpent)} / {s.fmt(total_budget)} ({budgetPct.toFixed(0)}%)
              </span>
            </div>
            <div style={s.progressBar(budgetPct, "")}>
              <div
                style={s.progressFill(budgetPct, budgetPct > 100 ? "#dc2626" : "#ea580c")}
              />
            </div>
          </div>
        )}

        {/* Day cards */}
        {itinerary.map((day: any, i: number) => {
          const dayCost = (day.activities || []).reduce(
            (sum: number, a: any) => sum + (a.cost || 0),
            0
          );
          return (
            <div
              key={i}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                marginBottom: 16,
                overflow: "hidden",
              }}
            >
              {/* Day header */}
              <div
                style={{
                  background: "#fff7ed",
                  padding: "10px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid #fed7aa",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 14, color: "#9a3412" }}>
                  {day.day}
                </span>
                {dayCost > 0 && (
                  <span style={s.chipBadge("#fed7aa", "#9a3412")}>{s.fmt(dayCost)}</span>
                )}
              </div>

              {/* Activities */}
              <div style={{ padding: 0 }}>
                {(day.activities || []).map((act: any, j: number) => (
                  <div
                    key={j}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "10px 16px",
                      borderBottom:
                        j < day.activities.length - 1 ? "1px solid #f3f4f6" : "none",
                      gap: 12,
                    }}
                  >
                    {/* Time */}
                    <div
                      style={{
                        minWidth: 72,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#ea580c",
                        paddingTop: 1,
                      }}
                    >
                      {act.time}
                    </div>

                    {/* Activity + location */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{act.activity}</div>
                      {act.location && (
                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                          📍 {act.location}
                        </div>
                      )}
                      {act.notes && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#9ca3af",
                            fontStyle: "italic",
                            marginTop: 2,
                          }}
                        >
                          {act.notes}
                        </div>
                      )}
                    </div>

                    {/* Cost */}
                    {act.cost != null && act.cost > 0 && (
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#374151",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.fmt(act.cost)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Total summary */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "12px 0",
            borderTop: "2px solid #e5e7eb",
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          <span>Total Estimated Cost</span>
          <span style={{ color: budgetPct > 100 ? "#dc2626" : "#059669" }}>
            {s.fmt(totalSpent)}
          </span>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<TripPlannerView />);
