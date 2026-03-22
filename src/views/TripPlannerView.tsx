import React, { useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import * as s from "./shared/styles";

function TripPlannerView() {
  const [data, setData] = useState<any>(null);
  const [appRef, setAppRef] = useState<any>(null);
  const [toast, setToast] = useState("");
  const [pendingChanges, setPendingChanges] = useState<string[]>([]);
  const [commentTarget, setCommentTarget] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [styleNote, setStyleNote] = useState("");
  const [showStyleBar, setShowStyleBar] = useState(false);

  useApp({
    appInfo: { name: "TripPlanner", version: "2.0.0" },
    capabilities: {},
    onAppCreated: (app) => {
      setAppRef(app);
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

  // Currency formatting
  const currency = data?.currency || "USD";
  const currencySymbol: Record<string, string> = {
    INR: "\u20B9", USD: "$", EUR: "\u20AC", GBP: "\u00A3", JPY: "\u00A5", AUD: "A$", CAD: "C$",
  };
  const sym = currencySymbol[currency] || currency + " ";

  const fmtCurr = useCallback((n: number) => {
    if (currency === "INR") {
      if (n >= 100000) return `${sym}${(n / 100000).toFixed(1)}L`;
      if (n >= 1000) return `${sym}${(n / 1000).toFixed(1)}K`;
      return `${sym}${n}`;
    }
    if (n >= 1000000) return `${sym}${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${sym}${(n / 1000).toFixed(0)}K`;
    return `${sym}${n}`;
  }, [currency, sym]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  // Queue a change
  const addChange = useCallback((change: string) => {
    setPendingChanges(prev => [...prev, change]);
    showToast("Change queued — send when ready");
  }, []);

  // Send all pending changes to Claude
  const sendChanges = useCallback(async () => {
    if (!appRef || pendingChanges.length === 0) return;
    const dest = data?.destination || "this destination";
    const days = data?.trip_days || data?.itinerary?.length || "";
    const currStr = currency !== "USD" ? ` Use ${currency} for all costs.` : "";
    const numbered = pendingChanges.map((c, i) => `${i + 1}. ${c}`).join("\n");
    try {
      await appRef.sendMessage({
        role: "user",
        content: [{
          type: "text",
          text: `[Itinerary modifications for ${dest}]\n\nPlease apply these changes:\n\n${numbered}\n\nRegenerate the full ${days ? days + "-day " : ""}itinerary using render_trip with all activities, times, locations, and costs.${currStr}`,
        }],
      });
      setPendingChanges([]);
      showToast("Sending changes to Claude...");
    } catch {
      showToast("Could not send — try typing in chat instead");
    }
  }, [appRef, pendingChanges, data, currency]);

  // Send a style/vibe preference
  const sendStylePref = useCallback(async (pref: string) => {
    if (!appRef) return;
    const dest = data?.destination || "this destination";
    const days = data?.trip_days || data?.itinerary?.length || "";
    const currStr = currency !== "USD" ? ` Use ${currency} for all costs.` : "";
    try {
      await appRef.sendMessage({
        role: "user",
        content: [{
          type: "text",
          text: `[Style preference for ${dest} itinerary]\n\n${pref}\n\nPlease regenerate the full ${days ? days + "-day " : ""}itinerary using render_trip, adjusted for this preference. Keep the same destination and budget.${currStr}`,
        }],
      });
      setStyleNote("");
      setShowStyleBar(false);
      showToast("Adjusting itinerary...");
    } catch {
      showToast("Could not send — try typing in chat instead");
    }
  }, [appRef, data, currency]);

  // Submit a comment on an activity
  const submitComment = useCallback((dayLabel: string, actName: string) => {
    if (!commentText.trim()) return;
    addChange(`For "${actName}" on ${dayLabel}: ${commentText.trim()}`);
    setCommentTarget(null);
    setCommentText("");
  }, [commentText, addChange]);

  if (!data) return <div style={{ padding: 24, color: "#6b7280" }}>Loading itinerary...</div>;

  const { title, total_budget, itinerary } = data;

  const totalSpent = itinerary.reduce(
    (sum: number, day: any) =>
      sum + (day.activities || []).reduce((ds: number, a: any) => ds + (a.cost || 0), 0),
    0
  );
  const budgetPct = total_budget ? (totalSpent / total_budget) * 100 : 0;

  const quickStyles = [
    { label: "More relaxed", desc: "Make it more relaxed — fewer activities, more free time" },
    { label: "More adventurous", desc: "Make it more adventurous — add outdoor activities, unique experiences" },
    { label: "More cultural", desc: "Focus more on cultural experiences — museums, local traditions, history" },
    { label: "Budget-friendly", desc: "Make it more budget-friendly — cheaper alternatives, free activities" },
    { label: "Foodie focus", desc: "Add more food experiences — local cuisine, street food, restaurants" },
  ];

  return (
    <div style={s.card}>
      <div style={s.header("#ea580c", "#d97706")}>
        <h2 style={s.headerTitle}>{title}</h2>
        <p style={s.headerSubtitle}>
          {itinerary.length} days
          {total_budget ? ` \u00B7 Budget: ${fmtCurr(total_budget)}` : ""}
        </p>
      </div>
      <div style={s.body}>
        {/* Style preference bar */}
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => setShowStyleBar(!showStyleBar)}
            style={{
              padding: "8px 14px", borderRadius: 8,
              border: "1px solid #e5e7eb", background: showStyleBar ? "#fff7ed" : "#f9fafb",
              color: "#374151", fontSize: 12, fontWeight: 600,
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            {showStyleBar ? "\u25B2" : "\u25BC"} Adjust trip style
          </button>

          {showStyleBar && (
            <div style={{ marginTop: 10, padding: 14, background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 10 }}>
                {quickStyles.map((qs, i) => (
                  <button
                    key={i}
                    onClick={() => sendStylePref(qs.desc)}
                    style={{
                      padding: "6px 12px", borderRadius: 16,
                      border: "1px solid #fed7aa", background: "#fff7ed",
                      color: "#9a3412", fontSize: 11, fontWeight: 500, cursor: "pointer",
                    }}
                  >
                    {qs.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Or type your own preference..."
                  value={styleNote}
                  onChange={(e) => setStyleNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && styleNote.trim() && sendStylePref(styleNote.trim())}
                  style={{
                    flex: 1, padding: "8px 12px", borderRadius: 8,
                    border: "1px solid #e5e7eb", fontSize: 12, outline: "none",
                  }}
                />
                <button
                  onClick={() => styleNote.trim() && sendStylePref(styleNote.trim())}
                  disabled={!styleNote.trim()}
                  style={{
                    padding: "8px 14px", borderRadius: 8, border: "none",
                    background: styleNote.trim() ? "#ea580c" : "#e5e7eb",
                    color: "#fff", fontSize: 12, fontWeight: 600, cursor: styleNote.trim() ? "pointer" : "default",
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Budget bar */}
        {total_budget && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Trip Budget</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: budgetPct > 100 ? "#dc2626" : "#059669" }}>
                {fmtCurr(totalSpent)} / {fmtCurr(total_budget)} ({budgetPct.toFixed(0)}%)
              </span>
            </div>
            <div style={s.progressBar(budgetPct, "")}>
              <div style={s.progressFill(budgetPct, budgetPct > 100 ? "#dc2626" : "#ea580c")} />
            </div>
          </div>
        )}

        {/* Day cards */}
        {itinerary.map((day: any, i: number) => {
          const dayCost = (day.activities || []).reduce(
            (sum: number, a: any) => sum + (a.cost || 0), 0
          );
          return (
            <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 16, overflow: "hidden" }}>
              {/* Day header */}
              <div style={{
                background: "#fff7ed", padding: "10px 16px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                borderBottom: "1px solid #fed7aa",
              }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#9a3412" }}>{day.day}</span>
                {dayCost > 0 && (
                  <span style={s.chipBadge("#fed7aa", "#9a3412")}>{fmtCurr(dayCost)}</span>
                )}
              </div>

              {/* Activities */}
              <div style={{ padding: 0 }}>
                {(day.activities || []).map((act: any, j: number) => {
                  const actKey = `${day.day}::${act.activity}`;
                  const isCommenting = commentTarget === actKey;

                  return (
                    <div key={j}>
                      <div style={{
                        display: "flex", alignItems: "flex-start", padding: "10px 16px",
                        borderBottom: j < day.activities.length - 1 && !isCommenting ? "1px solid #f3f4f6" : "none",
                        gap: 12,
                      }}>
                        {/* Time */}
                        <div style={{ minWidth: 72, fontSize: 12, fontWeight: 600, color: "#ea580c", paddingTop: 1 }}>
                          {act.time}
                        </div>

                        {/* Activity + location */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{act.activity}</div>
                          {act.location && (
                            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                              {"\uD83D\uDCCD"} {act.location}
                            </div>
                          )}
                          {act.notes && (
                            <div style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic", marginTop: 2 }}>
                              {act.notes}
                            </div>
                          )}
                        </div>

                        {/* Cost */}
                        {act.cost != null && act.cost > 0 && (
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", whiteSpace: "nowrap" as const }}>
                            {fmtCurr(act.cost)}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); addChange(`Swap "${act.activity}" on ${day.day} with a different activity`); }}
                            title="Swap this activity"
                            style={actionBtn}
                          >
                            {"\uD83D\uDD04"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); addChange(`Remove "${act.activity}" on ${day.day} and replace with free time or a lighter alternative`); }}
                            title="Remove this activity"
                            style={actionBtn}
                          >
                            {"\u2716"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setCommentTarget(isCommenting ? null : actKey); setCommentText(""); }}
                            title="Add a note"
                            style={{ ...actionBtn, background: isCommenting ? "#fff7ed" : "transparent", borderColor: isCommenting ? "#ea580c" : "#e5e7eb" }}
                          >
                            {"\uD83D\uDCAC"}
                          </button>
                        </div>
                      </div>

                      {/* Comment input */}
                      {isCommenting && (
                        <div style={{
                          display: "flex", gap: 8, padding: "6px 16px 10px",
                          borderBottom: j < day.activities.length - 1 ? "1px solid #f3f4f6" : "none",
                        }}>
                          <input
                            type="text"
                            autoFocus
                            placeholder={`Note about "${act.activity}"...`}
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && submitComment(day.day, act.activity)}
                            style={{
                              flex: 1, padding: "6px 10px", borderRadius: 6,
                              border: "1px solid #e5e7eb", fontSize: 12, outline: "none",
                            }}
                          />
                          <button
                            onClick={() => submitComment(day.day, act.activity)}
                            disabled={!commentText.trim()}
                            style={{
                              padding: "6px 12px", borderRadius: 6, border: "none",
                              background: commentText.trim() ? "#ea580c" : "#e5e7eb",
                              color: "#fff", fontSize: 11, fontWeight: 600, cursor: commentText.trim() ? "pointer" : "default",
                            }}
                          >
                            Add
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Total summary */}
        <div style={{
          display: "flex", justifyContent: "space-between", padding: "12px 0",
          borderTop: "2px solid #e5e7eb", fontWeight: 700, fontSize: 15,
        }}>
          <span>Total Estimated Cost</span>
          <span style={{ color: budgetPct > 100 ? "#dc2626" : "#059669" }}>
            {fmtCurr(totalSpent)}
          </span>
        </div>

        {/* Pending changes bar */}
        {pendingChanges.length > 0 && (
          <div style={{
            marginTop: 16, padding: 14, background: "#fff7ed",
            borderRadius: 10, border: "1px solid #fed7aa",
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#9a3412", marginBottom: 8 }}>
              {pendingChanges.length} pending change{pendingChanges.length > 1 ? "s" : ""}
            </div>
            {pendingChanges.map((c, i) => (
              <div key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 4, display: "flex", gap: 6, alignItems: "flex-start" }}>
                <span style={{ color: "#ea580c", flexShrink: 0 }}>{"\u2022"}</span>
                <span style={{ flex: 1 }}>{c}</span>
                <button
                  onClick={() => setPendingChanges(prev => prev.filter((_, idx) => idx !== i))}
                  style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 11, padding: 0 }}
                >
                  {"\u2716"}
                </button>
              </div>
            ))}
            <button
              onClick={sendChanges}
              style={{
                marginTop: 10, width: "100%", padding: "10px 16px",
                borderRadius: 8, border: "none", background: "#ea580c",
                color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}
            >
              Send changes to Claude
            </button>
          </div>
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

const actionBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 6,
  border: "1px solid #e5e7eb", background: "transparent",
  cursor: "pointer", fontSize: 12, display: "inline-flex",
  alignItems: "center", justifyContent: "center", padding: 0,
};

createRoot(document.getElementById("root")!).render(<TripPlannerView />);
