import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import * as s from "./shared/styles";

const COLORS = ["#2563eb", "#7c3aed", "#059669", "#ea580c", "#e11d48", "#0891b2", "#4f46e5", "#d97706"];

function BudgetView() {
  const [data, setData] = useState<any>(null);

  useApp({
    appInfo: { name: "BudgetTracker", version: "1.0.0" },
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

  if (!data) return <div style={{ padding: 24, color: "#6b7280" }}>Loading budget...</div>;

  const { title, total_budget, categories } = data;
  const totalActual = categories.reduce((sum: number, c: any) => sum + (c.actual || 0), 0);
  const totalBudgeted = categories.reduce((sum: number, c: any) => sum + (c.budgeted || 0), 0);
  const surplus = total_budget - totalActual;
  const pieData = categories.map((c: any) => ({ name: c.name, value: c.actual || 0 }));

  return (
    <div style={s.card}>
      <div style={s.header("#059669", "#0d9488")}>
        <h2 style={s.headerTitle}>{title}</h2>
        <p style={s.headerSubtitle}>
          Total Budget: {s.fmt(total_budget)} · Spent: {s.fmt(totalActual)} ·{" "}
          <span style={{ fontWeight: 700 }}>
            {surplus >= 0 ? `${s.fmt(surplus)} under` : `${s.fmt(Math.abs(surplus))} over`}
          </span>
        </p>
      </div>
      <div style={s.body}>
        {/* Summary metrics */}
        <div style={s.metricGrid(3)}>
          <div>
            <p style={s.metricLabel}>Budget</p>
            <p style={s.metricValue}>{s.fmt(total_budget)}</p>
          </div>
          <div>
            <p style={s.metricLabel}>Spent</p>
            <p style={{ ...s.metricValue, color: surplus < 0 ? "#dc2626" : "#111827" }}>
              {s.fmt(totalActual)}
            </p>
          </div>
          <div>
            <p style={s.metricLabel}>{surplus >= 0 ? "Remaining" : "Over Budget"}</p>
            <p style={{ ...s.metricValue, color: surplus >= 0 ? "#059669" : "#dc2626" }}>
              {s.fmt(Math.abs(surplus))}
            </p>
          </div>
        </div>

        {/* Pie Chart */}
        <p style={s.sectionTitle}>Spending Breakdown</p>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
              fontSize={11}
            >
              {pieData.map((_: any, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: any) => s.fmt(Number(v))} />
          </PieChart>
        </ResponsiveContainer>

        {/* Bar Chart: Budget vs Actual */}
        <p style={{ ...s.sectionTitle, marginTop: 20 }}>Budget vs Actual</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={categories} margin={{ left: 10, right: 10 }}>
            <XAxis dataKey="name" fontSize={11} />
            <YAxis fontSize={11} tickFormatter={(v) => s.fmt(v)} />
            <Tooltip formatter={(v: any) => s.fmt(Number(v))} />
            <Legend fontSize={11} />
            <Bar dataKey="budgeted" fill="#93c5fd" name="Budgeted" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" fill="#2563eb" name="Actual" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {/* Category breakdown with progress bars */}
        <p style={{ ...s.sectionTitle, marginTop: 20 }}>Category Details</p>
        {categories.map((c: any, i: number) => {
          const pct = c.budgeted > 0 ? (c.actual / c.budgeted) * 100 : 0;
          const over = pct > 100;
          return (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                <span style={{ fontSize: 12, color: over ? "#dc2626" : "#6b7280" }}>
                  {s.fmt(c.actual)} / {s.fmt(c.budgeted)} ({pct.toFixed(0)}%)
                </span>
              </div>
              <div style={s.progressBar(pct, "")}>
                <div style={s.progressFill(pct, over ? "#dc2626" : COLORS[i % COLORS.length])} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<BudgetView />);
