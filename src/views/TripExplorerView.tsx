import React, { useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import * as s from "./shared/styles";

function TripExplorerView() {
  const [data, setData] = useState<any>(null);
  const [appRef, setAppRef] = useState<any>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState("");
  const [adjBudget, setAdjBudget] = useState<number | null>(null);
  const [adjDays, setAdjDays] = useState<number | null>(null);

  useApp({
    appInfo: { name: "TripExplorer", version: "2.0.0" },
    capabilities: {},
    onAppCreated: (app) => {
      setAppRef(app);
      app.ontoolresult = (result: any) => {
        const d = result.structuredContent || (() => {
          const text = result.content?.find((c: any) => c.type === "text")?.text;
          return text ? JSON.parse(text) : null;
        })();
        if (d) {
          setData(d);
          if (d.budget) setAdjBudget(d.budget);
          if (d.trip_days) setAdjDays(d.trip_days);
        }
      };
    },
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  const currency = data?.currency || "USD";
  const currencySymbol: Record<string, string> = {
    INR: "\u20B9", USD: "$", EUR: "\u20AC", GBP: "\u00A3", JPY: "\u00A5", AUD: "A$", CAD: "C$",
  };
  const sym = currencySymbol[currency] || currency + " ";

  const fmtCurr = useCallback((n: number) => {
    if (currency === "INR") {
      if (n >= 100000) return sym + (n / 100000).toFixed(1) + "L";
      if (n >= 1000) return sym + (n / 1000).toFixed(0) + "K";
      return sym + n;
    }
    if (n >= 1000000) return sym + (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return sym + (n / 1000).toFixed(0) + "K";
    return sym + n;
  }, [currency, sym]);

  const toggleSelect = useCallback((i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  // Plan trip for one or two selected destinations
  const planSelected = useCallback(async () => {
    if (!appRef || selected.size === 0) return;
    const days = adjDays || data?.trip_days || 5;
    const budget = adjBudget || data?.budget;
    const budgetStr = budget ? ` with a ${sym}${budget} budget` : "";
    const currStr = currency !== "USD" ? ` Use ${currency} for all costs.` : "";
    const dests = Array.from(selected).map(i => data.destinations[i]);

    if (dests.length === 1) {
      try {
        await appRef.sendMessage({
          role: "user",
          content: [{
            type: "text",
            text: `I'd like to go to ${dests[0].name}, ${dests[0].country} for ${days} days${budgetStr}. Please create a detailed day-by-day itinerary using render_trip with specific activities, times, locations, and costs.${currStr}`,
          }],
        });
        showToast("Planning your " + dests[0].name + " trip...");
      } catch {
        showToast("Could not send \u2014 try typing in chat instead");
      }
    } else {
      const names = dests.map(d => d.name + ", " + d.country).join(" and ");
      try {
        await appRef.sendMessage({
          role: "user",
          content: [{
            type: "text",
            text: `I'd like to compare detailed itineraries for ${names} \u2014 both for ${days} days${budgetStr}. Please create a day-by-day itinerary for EACH destination using render_trip (call it twice, once per destination) with specific activities, times, locations, and costs so I can compare them side by side.${currStr}`,
          }],
        });
        showToast("Planning both itineraries...");
      } catch {
        showToast("Could not send \u2014 try typing in chat instead");
      }
    }
  }, [appRef, selected, data, adjBudget, adjDays, currency, sym]);

  const planTrip = useCallback(async (dest: any) => {
    if (!appRef) return;
    const days = adjDays || data?.trip_days || 5;
    const budget = adjBudget || data?.budget;
    const budgetStr = budget ? ` with a ${sym}${budget} budget` : "";
    const currStr = currency !== "USD" ? ` Use ${currency} for all costs.` : "";
    try {
      await appRef.sendMessage({
        role: "user",
        content: [{
          type: "text",
          text: `I'd like to go to ${dest.name}, ${dest.country} for ${days} days${budgetStr}. Please create a detailed day-by-day itinerary using render_trip with specific activities, times, locations, and costs.${currStr}`,
        }],
      });
      showToast("Planning your " + dest.name + " trip...");
    } catch {
      showToast("Could not send \u2014 try typing in chat instead");
    }
  }, [appRef, data, adjBudget, adjDays, currency, sym]);

  const refreshOptions = useCallback(async () => {
    if (!appRef) return;
    const days = adjDays || data?.trip_days || 5;
    const budget = adjBudget || data?.budget;
    const source = data?.source || "";
    const budgetStr = budget ? ` with a ${sym}${budget} budget` : "";
    const sourceStr = source ? " from " + source : "";
    const currStr = currency !== "USD" ? ` Use ${currency} for all costs and budget estimates.` : "";
    try {
      await appRef.sendMessage({
        role: "user",
        content: [{
          type: "text",
          text: `[Updated preferences] I want to explore ${days}-day trip options${sourceStr}${budgetStr}. Please show me new destination options using render_trip_explorer with updated budget estimates for ${days} days.${currStr}`,
        }],
      });
      showToast("Refreshing options with new preferences...");
    } catch {
      showToast("Could not send \u2014 try typing in chat instead");
    }
  }, [appRef, data, adjBudget, adjDays, currency, sym]);

  if (!data) return <div style={{ padding: 24, color: "#6b7280" }}>Loading destinations...</div>;

  const { title, destinations, trip_days, budget, source } = data;
  const activeBudget = adjBudget || budget;
  const activeDays = adjDays || trip_days;

  const budgetFit = (dest: any) => {
    if (!activeBudget || !dest.budget_estimate) return "unknown";
    if (activeBudget >= dest.budget_estimate.high) return "comfortable";
    if (activeBudget >= dest.budget_estimate.low) return "moderate";
    return "tight";
  };

  const fitColor: Record<string, { bg: string; text: string; label: string }> = {
    comfortable: { bg: "#dcfce7", text: "#166534", label: "Within budget" },
    moderate: { bg: "#fef9c3", text: "#854d0e", label: "Budget fit" },
    tight: { bg: "#fee2e2", text: "#991b1b", label: "Over budget" },
    unknown: { bg: "#f3f4f6", text: "#6b7280", label: "\u2014" },
  };

  const modeIcon: Record<string, string> = {
    flight: "\u2708\uFE0F", train: "\uD83D\uDE86", drive: "\uD83D\uDE97", bus: "\uD83D\uDE8C",
  };

  const hasPrefsChanged = (adjBudget != null && adjBudget !== budget) || (adjDays != null && adjDays !== trip_days);

  return (
    <div style={s.card}>
      <div style={s.header("#ea580c", "#d97706")}>
        <h2 style={s.headerTitle}>{title || "Where should you go?"}</h2>
        <p style={s.headerSubtitle}>
          {destinations.length} destinations
          {source ? " from " + source : ""}
          {activeDays ? " \u00B7 " + activeDays + " days" : ""}
          {activeBudget ? " \u00B7 Budget: " + fmtCurr(activeBudget) : ""}
        </p>
      </div>

      <div style={s.body}>
        {/* Multi-select hint + action */}
        {selected.size > 0 && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px", marginBottom: 16, background: "#fff7ed",
            borderRadius: 8, border: "1px solid #fed7aa",
          }}>
            <span style={{ fontSize: 13, color: "#9a3412" }}>
              {selected.size} destination{selected.size > 1 ? "s" : ""} selected
              {selected.size === 2 && " \u2014 compare both itineraries"}
            </span>
            <button
              onClick={planSelected}
              style={{
                padding: "7px 16px", borderRadius: 8, border: "none",
                background: "#ea580c", color: "#fff", fontWeight: 600,
                fontSize: 12, cursor: "pointer",
              }}
            >
              {selected.size === 1 ? "Plan this trip" : "Compare both"}
            </button>
          </div>
        )}

        {/* Adjustable preferences bar */}
        {(budget || trip_days) && (
          <div style={{
            display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 20,
            padding: 16, background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb",
            flexWrap: "wrap" as const,
          }}>
            {trip_days && (
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                  Trip duration
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="range" min={2} max={21}
                    value={adjDays || trip_days}
                    onChange={(e) => setAdjDays(Number(e.target.value))}
                    style={{ flex: 1, accentColor: "#ea580c" }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 700, minWidth: 50 }}>{adjDays || trip_days} days</span>
                </div>
              </div>
            )}
            {budget && (
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                  Budget ({currency})
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="range"
                    min={Math.round(budget * 0.3)} max={Math.round(budget * 3)}
                    step={currency === "INR" ? 5000 : 100}
                    value={adjBudget || budget}
                    onChange={(e) => setAdjBudget(Number(e.target.value))}
                    style={{ flex: 1, accentColor: "#ea580c" }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 700, minWidth: 70 }}>{fmtCurr(adjBudget || budget)}</span>
                </div>
              </div>
            )}
            {hasPrefsChanged && (
              <button
                onClick={refreshOptions}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "1px solid #ea580c",
                  background: "#fff7ed", color: "#ea580c", fontWeight: 600, fontSize: 12,
                  cursor: "pointer", whiteSpace: "nowrap" as const,
                }}
              >
                Refresh options
              </button>
            )}
          </div>
        )}

        {/* Destination cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: destinations.length <= 2 ? "repeat(" + destinations.length + ", 1fr)" : "repeat(" + Math.min(destinations.length, 3) + ", 1fr)",
          gap: 16,
        }}>
          {destinations.map((dest: any, i: number) => {
            const fit = budgetFit(dest);
            const fitInfo = fitColor[fit];
            const isSelected = selected.has(i);

            return (
              <div
                key={i}
                style={{
                  border: isSelected ? "2px solid #ea580c" : "1px solid #e5e7eb",
                  borderRadius: 12,
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                  background: isSelected ? "#fff7ed" : "#fff",
                }}
              >
                {/* Card header */}
                <div
                  onClick={() => toggleSelect(i)}
                  style={{
                    background: isSelected ? "#ea580c" : "#f9fafb",
                    padding: "14px 16px",
                    color: isSelected ? "#fff" : "#111827",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <span style={{ fontSize: 22, marginRight: 8 }}>{dest.image_emoji || "\uD83C\uDF0D"}</span>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{dest.name}</span>
                    <span style={{ fontSize: 13, opacity: 0.7, marginLeft: 6 }}>{dest.country}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {activeBudget && dest.budget_estimate && (
                      <span style={{
                        ...s.badge(isSelected ? "rgba(255,255,255,0.2)" : fitInfo.bg, isSelected ? "#fff" : fitInfo.text),
                        fontSize: 10,
                      }}>
                        {fitInfo.label}
                      </span>
                    )}
                    {/* Selection checkbox */}
                    <div style={{
                      width: 20, height: 20, borderRadius: 4,
                      border: isSelected ? "2px solid #fff" : "2px solid #d1d5db",
                      background: isSelected ? "#fff" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {isSelected && <span style={{ color: "#ea580c", fontSize: 14, fontWeight: 700 }}>{"\u2713"}</span>}
                    </div>
                  </div>
                </div>

                <div style={{ padding: 16 }}>
                  {/* Tagline */}
                  {dest.tagline && (
                    <p style={{ fontSize: 13, color: "#6b7280", fontStyle: "italic", margin: "0 0 12px" }}>
                      {dest.tagline}
                    </p>
                  )}

                  {/* Budget estimate */}
                  {dest.budget_estimate && (
                    <div style={{ fontSize: 12, color: "#374151", marginBottom: 10 }}>
                      <span style={{ fontWeight: 600 }}>{fmtCurr(dest.budget_estimate.low)}{" \u2013 "}{fmtCurr(dest.budget_estimate.high)}</span>
                      <span style={{ color: "#9ca3af", marginLeft: 4 }}>est. total</span>
                    </div>
                  )}

                  {/* Weather / temperature */}
                  {dest.weather && (
                    <div style={{
                      display: "flex", gap: 8, alignItems: "center",
                      marginBottom: 10, fontSize: 12, color: "#374151",
                    }}>
                      <span>{"\uD83C\uDF21\uFE0F"}</span>
                      <span style={{ fontWeight: 600 }}>{dest.weather.temp_range || dest.weather}</span>
                      {dest.weather.condition && (
                        <span style={{ color: "#9ca3af" }}>{dest.weather.condition}</span>
                      )}
                    </div>
                  )}

                  {/* Distance + travel modes */}
                  {(dest.distance_km != null || dest.travel_options) && (
                    <div style={{
                      background: "#f9fafb", borderRadius: 8, padding: "8px 10px",
                      marginBottom: 12, border: "1px solid #f3f4f6",
                    }}>
                      {dest.distance_km != null && (
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: dest.travel_options ? 6 : 0 }}>
                          {dest.distance_km >= 1000 ? (dest.distance_km / 1000).toFixed(1) + "K" : dest.distance_km} km away
                        </div>
                      )}
                      {dest.travel_options && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                          {Object.entries(dest.travel_options).map(([mode, duration]: [string, any]) => (
                            <span key={mode} style={{
                              fontSize: 11, color: "#6b7280",
                              display: "inline-flex", alignItems: "center", gap: 3,
                            }}>
                              {modeIcon[mode] || ""} {duration}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Best months */}
                  {dest.best_months?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Best months</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                        {dest.best_months.map((m: string, j: number) => (
                          <span key={j} style={s.chipBadge("#f3f4f6", "#374151")}>{m}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Highlights */}
                  {dest.highlights?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Highlights</div>
                      {dest.highlights.slice(0, 5).map((h: string, j: number) => (
                        <div key={j} style={{ fontSize: 12, marginBottom: 3, display: "flex", gap: 6, alignItems: "flex-start" }}>
                          <span style={{ color: "#ea580c", flexShrink: 0 }}>{"\u2022"}</span>
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Travel style tags */}
                  {dest.travel_style?.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, marginBottom: 14 }}>
                      {dest.travel_style.map((tag: string, j: number) => (
                        <span key={j} style={s.chipBadge("#fff7ed", "#9a3412")}>{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* Plan button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); planTrip(dest); }}
                    style={{
                      width: "100%", padding: "10px 16px", borderRadius: 8,
                      border: "none", background: isSelected ? "#ea580c" : "#f97316",
                      color: "#fff", fontWeight: 600, fontSize: 13,
                      cursor: "pointer", transition: "background 0.2s",
                    }}
                  >
                    Plan this trip
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Multi-select hint */}
        {selected.size === 0 && (
          <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center" as const, marginTop: 12 }}>
            Tap a card header to select it. Select up to 2 to compare detailed itineraries side by side.
          </p>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed" as const, bottom: 20, left: "50%",
          transform: "translateX(-50%)", background: "#18181b", color: "#fff",
          padding: "10px 20px", borderRadius: 8, fontSize: 13, zIndex: 999,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<TripExplorerView />);
