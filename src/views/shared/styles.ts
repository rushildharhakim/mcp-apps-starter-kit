/** Inline styles for iframe views — no Tailwind needed inside iframes. */

export const card: React.CSSProperties = {
  fontFamily: "system-ui, -apple-system, sans-serif",
  background: "#fff",
  borderRadius: 12,
  overflow: "hidden",
  fontSize: 14,
  color: "#374151",
  lineHeight: 1.5,
};

export const header = (from: string, to: string): React.CSSProperties => ({
  background: `linear-gradient(135deg, ${from}, ${to})`,
  padding: "16px 24px",
  color: "#fff",
});

export const headerTitle: React.CSSProperties = { fontSize: 20, fontWeight: 700, margin: 0 };
export const headerSubtitle: React.CSSProperties = { fontSize: 13, opacity: 0.8, margin: 0 };

export const body: React.CSSProperties = { padding: 24 };

export const metricGrid = (cols: number): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: `repeat(${cols}, 1fr)`,
  gap: 16,
  marginBottom: 20,
});

export const metricLabel: React.CSSProperties = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#6b7280",
  margin: 0,
};

export const metricValue: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: "#111827",
  margin: 0,
};

export const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
  margin: "0 0 8px",
};

export const badge = (bg: string, color: string): React.CSSProperties => ({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  background: bg,
  color,
});

export function fmt(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
}

export const progressBar = (pct: number, color: string): React.CSSProperties => ({
  height: 8,
  borderRadius: 4,
  background: "#f3f4f6",
  overflow: "hidden",
  position: "relative" as const,
});

export const progressFill = (pct: number, color: string): React.CSSProperties => ({
  height: "100%",
  width: `${Math.min(pct, 100)}%`,
  background: color,
  borderRadius: 4,
  transition: "width 0.3s ease",
});

export const tableHeader: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#6b7280",
  padding: "8px 12px",
  textAlign: "left",
  borderBottom: "2px solid #e5e7eb",
};

export const tableCell: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #f3f4f6",
  fontSize: 13,
};

export const chipBadge = (bg: string, color: string): React.CSSProperties => ({
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 12,
  fontSize: 11,
  fontWeight: 500,
  background: bg,
  color,
});
