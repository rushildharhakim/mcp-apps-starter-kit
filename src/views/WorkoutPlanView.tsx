import React, { useState, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useApp } from "@modelcontextprotocol/ext-apps/react";

// ─── Design System ──────────────────────────────────────────────────
const c = {
  bg: "#09090b",
  raised: "#111113",
  surface: "#18181b",
  border: "#27272a",
  borderSubtle: "#1f1f23",
  text: "#fafafa",
  text2: "#a1a1aa",
  text3: "#71717a",
  text4: "#52525b",
  accent: "#3b82f6",
  accentSoft: "rgba(59,130,246,0.08)",
  success: "#34d399",
  successSoft: "rgba(52,211,153,0.1)",
  warm: "#fbbf24",
  orange: "#f97316",
  orangeSoft: "rgba(249,115,22,0.1)",
};

const muscleColor: Record<string, string> = {
  chest: "#f87171", back: "#60a5fa", legs: "#4ade80",
  shoulders: "#a78bfa", arms: "#fb923c", biceps: "#fb923c",
  triceps: "#fb923c", core: "#2dd4bf", abs: "#2dd4bf",
  cardio: "#f472b6", glutes: "#4ade80",
  full_body: "#818cf8", "full body": "#818cf8",
};

function dotColor(group: string): string {
  return muscleColor[(group || "").toLowerCase().replace(/[-_]/g, " ")] || c.text3;
}

function computeMetrics(plan: any[]) {
  let exercises = 0, calories = 0, duration = 0, days = 0;
  const groups = new Set<string>();
  for (const w of plan) for (const d of w.days || []) {
    const exs = d.exercises || [];
    if (exs.length) { days++; for (const e of exs) {
      exercises++; calories += e.estimated_calories || 0;
      duration += e.duration_minutes || 0;
      if (e.muscle_group) groups.add(e.muscle_group.toLowerCase());
    }}
  }
  return { exercises, calories, duration, days, groups: groups.size };
}

// ─── Toast ──────────────────────────────────────────────────────────
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
      background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8,
      padding: "8px 16px", fontSize: 12, color: c.text2, zIndex: 100,
      boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
    }}>{message}</div>
  );
}

// ─── Pending Tweak type ─────────────────────────────────────────────
type PendingTweak = { exerciseName: string; dayLabel: string; description: string };

// ─── Tweak Menu (stages tweaks, does NOT send immediately) ──────────
function TweakMenu({ ex, dayLabel, onStage, onClose }: {
  ex: any; dayLabel: string;
  onStage: (tweak: PendingTweak) => void; onClose: () => void;
}) {
  const [custom, setCustom] = useState("");
  const presets = [
    { label: "Swap", desc: `Replace with a different exercise targeting ${ex.muscle_group}, same sets/reps` },
    { label: "Easier", desc: `Replace with an easier beginner-friendly alternative for ${ex.muscle_group}` },
    { label: "Harder", desc: `Replace with a more advanced/challenging alternative for ${ex.muscle_group}` },
    { label: "Skip", desc: `Remove and redistribute volume across remaining exercises` },
    { label: "Adjust volume", desc: `Change sets/reps (current: ${ex.sets}×${ex.reps}), suggest better scheme for hypertrophy` },
  ];

  const stage = (desc: string) => {
    onStage({ exerciseName: ex.name, dayLabel, description: desc });
    onClose();
  };

  return (
    <div style={{
      background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8,
      padding: 12, marginTop: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: c.text3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Stage a modification
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: c.text4, cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
        {presets.map((p, i) => (
          <button key={i} onClick={() => stage(p.desc)} style={{
            padding: "5px 10px", border: `1px solid ${c.border}`, borderRadius: 6,
            background: "transparent", color: c.text2, fontSize: 11, cursor: "pointer",
          }}>{p.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input type="text" placeholder="Or describe your change..."
          value={custom} onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && custom.trim()) stage(custom.trim()); }}
          style={{
            flex: 1, background: c.bg, border: `1px solid ${c.border}`,
            borderRadius: 6, color: c.text, padding: "6px 10px", fontSize: 12, outline: "none",
          }} />
        <button onClick={() => { if (custom.trim()) stage(custom.trim()); }} style={{
          padding: "6px 12px", border: `1px solid ${c.accent}`, borderRadius: 6,
          background: c.accentSoft, color: c.accent, fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>Add</button>
      </div>
    </div>
  );
}

// ─── Pending Tweaks Bar ─────────────────────────────────────────────
function PendingTweaksBar({ tweaks, onRemove, onSend, onClear, sending }: {
  tweaks: PendingTweak[]; onRemove: (i: number) => void;
  onSend: () => void; onClear: () => void; sending: boolean;
}) {
  if (!tweaks.length) return null;
  return (
    <div style={{
      margin: "0 16px 12px", padding: 12, background: c.surface,
      border: `1px solid ${c.orange}33`, borderRadius: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: c.orange, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {tweaks.length} pending modification{tweaks.length > 1 ? "s" : ""}
        </span>
        <button onClick={onClear} style={{
          background: "none", border: "none", color: c.text4, cursor: "pointer", fontSize: 11,
        }}>Clear all</button>
      </div>
      {tweaks.map((tw, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
          borderBottom: i < tweaks.length - 1 ? `1px solid ${c.borderSubtle}` : "none",
        }}>
          <span style={{ fontSize: 12, color: c.text, fontWeight: 500, whiteSpace: "nowrap" }}>{tw.exerciseName}</span>
          <span style={{ fontSize: 11, color: c.text4 }}>on {tw.dayLabel}:</span>
          <span style={{ fontSize: 11, color: c.text3, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tw.description}
          </span>
          <button onClick={() => onRemove(i)} style={{
            background: "none", border: "none", color: c.text4, cursor: "pointer",
            fontSize: 12, padding: "0 4px", flexShrink: 0,
          }}>×</button>
        </div>
      ))}
      <button onClick={onSend} disabled={sending} style={{
        width: "100%", marginTop: 8, padding: "8px 16px",
        border: "none", borderRadius: 6,
        background: sending ? c.surface : `linear-gradient(135deg, ${c.accent}, #6366f1)`,
        color: sending ? c.text4 : "#fff",
        fontSize: 12, fontWeight: 600, cursor: sending ? "default" : "pointer",
      }}>
        {sending ? "Sending to Claude..." : `Send all ${tweaks.length} modification${tweaks.length > 1 ? "s" : ""} to Claude`}
      </button>
    </div>
  );
}

// ─── Exercise Row ───────────────────────────────────────────────────
function ExerciseRow({ ex, idx, dayLabel, progress, onUpdate, onStage, onOpenVideo, hasPendingTweak }: {
  ex: any; idx: number; dayLabel: string;
  progress?: { actualWeight?: string; actualReps?: string; done?: boolean };
  onUpdate: (i: number, d: any) => void;
  onStage: (tweak: PendingTweak) => void;
  onOpenVideo: (ex: any) => void;
  hasPendingTweak: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showTweak, setShowTweak] = useState(false);
  const done = progress?.done;

  return (
    <div style={{ borderBottom: `1px solid ${c.borderSubtle}` }}>
      {/* Main row */}
      <div onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px", cursor: "pointer",
      }}>
        <div onClick={(e) => { e.stopPropagation(); onUpdate(idx, { done: !done }); }} style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
          border: done ? `1.5px solid ${c.success}` : `1.5px solid ${c.text4}`,
          background: done ? c.successSoft : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", transition: "all 0.15s",
        }}>
          {done && <span style={{ color: c.success, fontSize: 11, fontWeight: 700 }}>✓</span>}
        </div>

        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor(ex.muscle_group), flexShrink: 0 }} />
          <span style={{
            fontSize: 13, fontWeight: 500, color: done ? c.text4 : c.text,
            textDecoration: done ? "line-through" : "none", letterSpacing: "-0.01em",
          }}>{ex.name}</span>
          {hasPendingTweak && (
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.orange, flexShrink: 0 }} />
          )}
        </div>

        <span style={{ fontSize: 12, fontWeight: 600, color: c.text2, fontVariantNumeric: "tabular-nums" }}>
          {ex.sets} × {ex.reps}
        </span>
        {ex.rest && <span style={{
          fontSize: 11, color: c.text4, padding: "2px 8px", background: c.raised, borderRadius: 4,
        }}>{ex.rest}</span>}

        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke={c.text4} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {open && (
        <div style={{ padding: "0 16px 14px 46px" }}>
          {/* Stats */}
          <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
            {ex.estimated_calories > 0 && <span style={{ fontSize: 12, color: c.warm }}>~{ex.estimated_calories} cal</span>}
            {ex.duration_minutes > 0 && <span style={{ fontSize: 12, color: c.text3 }}>~{ex.duration_minutes} min</span>}
            {ex.muscle_group && <span style={{ fontSize: 12, color: dotColor(ex.muscle_group) }}>{ex.muscle_group}</span>}
          </div>

          {/* Tips */}
          {ex.tips?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: c.text3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                Form cues
              </div>
              {ex.tips.map((tip: string, i: number) => (
                <div key={i} style={{ fontSize: 12, color: c.text2, padding: "3px 0", display: "flex", gap: 8, lineHeight: 1.4 }}>
                  <span style={{ color: c.text4, flexShrink: 0 }}>—</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}

          {/* Weight / Reps tracking */}
          <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: c.text4, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Weight</div>
              <input type="text" placeholder="135 lbs"
                value={progress?.actualWeight || ""}
                onChange={(e) => onUpdate(idx, { actualWeight: e.target.value })}
                style={{
                  background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6,
                  color: c.text, padding: "6px 10px", fontSize: 12, width: 90, outline: "none",
                }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: c.text4, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Reps done</div>
              <input type="text" placeholder="10, 10, 8"
                value={progress?.actualReps || ""}
                onChange={(e) => onUpdate(idx, { actualReps: e.target.value })}
                style={{
                  background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6,
                  color: c.text, padding: "6px 10px", fontSize: 12, width: 100, outline: "none",
                }} />
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {/* Video link */}
            <button onClick={() => onOpenVideo(ex)} style={{
              padding: "5px 10px",
              border: `1px solid ${ex.video_url ? "#ef4444" : c.border}`,
              borderRadius: 6,
              background: ex.video_url ? "rgba(239,68,68,0.08)" : "transparent",
              color: ex.video_url ? "#f87171" : c.text3,
              fontSize: 11, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 5,
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4 2.5L9.5 6L4 9.5V2.5Z" fill={ex.video_url ? "#f87171" : c.text3}/>
              </svg>
              {ex.video_url ? "Watch form guide" : "Find reference video"}
            </button>

            {/* Modify */}
            <button onClick={() => setShowTweak(!showTweak)} style={{
              padding: "5px 10px", border: `1px solid ${hasPendingTweak ? c.orange + "55" : c.border}`, borderRadius: 6,
              background: hasPendingTweak ? c.orangeSoft : "transparent",
              color: hasPendingTweak ? c.orange : c.text3,
              fontSize: 11, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 5,
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M9.5 1.5L10.5 2.5L4 9L1.5 9.5L2 7L9.5 1.5Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {hasPendingTweak ? "Tweak staged" : "Modify"}
            </button>
          </div>

          {showTweak && (
            <TweakMenu ex={ex} dayLabel={dayLabel}
              onStage={onStage} onClose={() => setShowTweak(false)} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── History ────────────────────────────────────────────────────────
function HistoryView({ history }: { history: any[] }) {
  if (!history.length) return (
    <div style={{ textAlign: "center", padding: "48px 20px" }}>
      <div style={{ fontSize: 15, fontWeight: 500, color: c.text3, marginBottom: 4 }}>No sessions logged</div>
      <div style={{ fontSize: 13, color: c.text4 }}>Complete and save workouts to build your history.</div>
    </div>
  );

  // Client-side dedup: keep only the latest entry per week+day
  const deduped: any[] = [];
  const seen = new Set<string>();
  for (const e of [...history].reverse()) {
    const k = `${e.week}::${e.day}`;
    if (!seen.has(k)) { seen.add(k); deduped.unshift(e); }
  }

  const byWeek: Record<string, any[]> = {};
  for (const e of deduped) { const k = e.week || "Unknown"; (byWeek[k] ??= []).push(e); }

  return (
    <div>
      {Object.entries(byWeek).map(([week, entries]) => (
        <div key={week} style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: c.text3,
            textTransform: "uppercase", letterSpacing: "0.06em",
            marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${c.border}`,
          }}>{week}</div>
          {entries.map((entry: any, ei: number) => {
            const done = (entry.exercises || []).filter((e: any) => e.done).length;
            const total = (entry.exercises || []).length;
            return (
              <div key={ei} style={{
                background: c.surface, borderRadius: 8, padding: "12px 16px",
                marginBottom: 6, border: `1px solid ${c.borderSubtle}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{entry.day}</span>
                    <span style={{ fontSize: 11, color: c.text4 }}>
                      {new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: done === total ? c.success : c.text3,
                  }}>{done}/{total}</span>
                </div>
                {(entry.exercises || []).map((ex: any, i: number) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "3px 0", fontSize: 12, color: ex.done ? c.text2 : c.text4,
                  }}>
                    <span style={{ color: ex.done ? c.success : c.text4, fontSize: 10 }}>{ex.done ? "●" : "○"}</span>
                    <span style={{ flex: 1 }}>{ex.name}</span>
                    {ex.actualWeight && <span style={{ color: c.text3, fontSize: 11 }}>{ex.actualWeight}</span>}
                    {ex.actualReps && <span style={{ color: c.text4, fontSize: 11 }}>({ex.actualReps})</span>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────
function WorkoutPlanView() {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<"plan" | "history">("plan");
  const [week, setWeek] = useState(0);
  const [progress, setProgress] = useState<Record<string, Record<number, any>>>({});
  const [history, setHistory] = useState<any[]>([]);
  const [appRef, setAppRef] = useState<any>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [pendingTweaks, setPendingTweaks] = useState<PendingTweak[]>([]);
  const videoRequestedRef = useRef(false);

  useApp({
    appInfo: { name: "WorkoutPlan", version: "2.0.0" },
    capabilities: {},
    onAppCreated: (a) => {
      setAppRef(a);
      a.ontoolresult = (r: any) => {
        if (r.structuredContent) setData(r.structuredContent);
        else {
          const t = r.content?.find((x: any) => x.type === "text")?.text;
          if (t) setData(JSON.parse(t));
        }
      };
    },
  });

  useEffect(() => {
    if (!appRef) return;
    appRef.callServerTool({ name: "get_workout_log", arguments: {} })
      .then((r: any) => {
        const t = r?.content?.find((x: any) => x.type === "text")?.text;
        if (t) setHistory(JSON.parse(t));
      }).catch(() => {});
  }, [appRef, data]);

  const updateProgress = useCallback((dayKey: string, idx: number, updates: any) => {
    setProgress(p => ({
      ...p,
      [dayKey]: { ...(p[dayKey] || {}), [idx]: { ...(p[dayKey]?.[idx] || {}), ...updates } },
    }));
  }, []);

  const save = useCallback(async (weekLabel: string, day: any, dayKey: string) => {
    if (!appRef) return;
    setSaving(dayKey);
    const dp = progress[dayKey] || {};
    const exs = (day.exercises || []).map((ex: any, i: number) => ({
      name: ex.name, sets: ex.sets, reps: ex.reps, muscle_group: ex.muscle_group,
      done: dp[i]?.done || false, actualWeight: dp[i]?.actualWeight || "", actualReps: dp[i]?.actualReps || "",
    }));
    try {
      await appRef.callServerTool({
        name: "save_workout_log",
        arguments: { date: new Date().toISOString(), week: weekLabel, day: day.day, exercises: JSON.stringify(exs) },
      });
      setToast("Session saved!");
      const r = await appRef.callServerTool({ name: "get_workout_log", arguments: {} });
      const t = r?.content?.find((x: any) => x.type === "text")?.text;
      if (t) setHistory(JSON.parse(t));
    } catch {
      setToast("Save failed");
    }
    setSaving(null);
  }, [appRef, progress]);

  // Stage a tweak (add to queue, replacing any existing tweak for same exercise+day)
  const stageTweak = useCallback((tweak: PendingTweak) => {
    setPendingTweaks(prev => {
      const filtered = prev.filter(t => !(t.exerciseName === tweak.exerciseName && t.dayLabel === tweak.dayLabel));
      return [...filtered, tweak];
    });
    setToast(`Staged: ${tweak.exerciseName}`);
  }, []);

  const removeTweak = useCallback((index: number) => {
    setPendingTweaks(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Send all staged tweaks as one combined message to Claude
  const sendAllTweaks = useCallback(async () => {
    if (!appRef || !pendingTweaks.length) return;
    setSending(true);
    const modifications = pendingTweaks
      .map((tw, i) => `${i + 1}. "${tw.exerciseName}" on ${tw.dayLabel}: ${tw.description}`)
      .join("\n");
    try {
      await appRef.sendMessage({
        role: "user",
        content: [{ type: "text", text: `[Workout Plan Modifications]\n\nPlease apply the following changes to my workout plan:\n\n${modifications}\n\nRegenerate the full updated workout plan using the render_workout tool with all modifications applied.` }],
      });
      setPendingTweaks([]);
      setToast("Sent to Claude — updated plan incoming...");
    } catch {
      setToast("Could not send — try typing in chat instead");
    }
    setSending(false);
  }, [appRef, pendingTweaks]);

  // Open video: use app.openLink() if URL exists, otherwise ask Claude
  const openVideo = useCallback(async (ex: any) => {
    if (!appRef) return;
    if (ex.video_url) {
      try {
        await appRef.openLink({ url: ex.video_url });
      } catch {
        setToast("Could not open link");
      }
    } else {
      setToast(`Asking Claude for ${ex.name} video...`);
      try {
        await appRef.sendMessage({
          role: "user",
          content: [{ type: "text", text: `Find me a good YouTube reference video for "${ex.name}" with proper form demonstration. Provide the direct link and a brief description of why it's a good reference.` }],
        });
      } catch {
        setToast("Could not send — try typing in chat instead");
      }
    }
  }, [appRef]);

  // Auto-request video URLs if missing on first load
  useEffect(() => {
    if (!appRef || !data?.plan || videoRequestedRef.current) return;
    const allExercises: string[] = [];
    for (const w of data.plan) {
      for (const d of w.days || []) {
        for (const ex of d.exercises || []) {
          if (!ex.video_url) allExercises.push(ex.name);
        }
      }
    }
    if (allExercises.length === 0) return; // all exercises already have video URLs
    videoRequestedRef.current = true;
    setToast("Fetching reference videos...");
    const unique = [...new Set(allExercises)];
    appRef.sendMessage({
      role: "user",
      content: [{ type: "text", text: `[Auto-request] The workout plan is missing video URLs. Please re-render the exact same workout plan using render_workout, but this time include a video_url for every exercise with a real YouTube link to a proper form/technique demonstration video. Keep everything else identical — same exercises, sets, reps, tips, calories, duration. Just add video_url to each exercise. The exercises that need videos: ${unique.join(", ")}` }],
    }).catch(() => {});
  }, [appRef, data]);

  if (!data) return (
    <div style={{
      padding: 32, color: c.text4, background: c.bg,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>Loading...</div>
  );

  const { title, plan, estimated_total_calories, estimated_total_duration } = data;
  const m = computeMetrics(plan);

  // Check which exercises have pending tweaks
  const tweakSet = new Set(pendingTweaks.map(t => `${t.dayLabel}::${t.exerciseName}`));

  return (
    <div style={{
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      background: c.bg, color: c.text, fontSize: 14, lineHeight: 1.5,
    }}>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* ── Header ── */}
      <div style={{ padding: "24px 24px 20px", borderBottom: `1px solid ${c.border}` }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: c.text, letterSpacing: "-0.025em" }}>{title}</h1>
        <p style={{ fontSize: 13, color: c.text3, margin: "4px 0 0" }}>
          {plan.length}w · {m.days} sessions · {m.exercises} exercises
        </p>
      </div>

      {/* ── Metrics ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: `1px solid ${c.border}` }}>
        {[
          { label: "Exercises", val: m.exercises },
          { label: "Est. Calories", val: (estimated_total_calories || m.calories || 0).toLocaleString() },
          { label: "Est. Time", val: `${estimated_total_duration || m.duration || 0}m` },
          { label: "Muscle Groups", val: m.groups },
        ].map((item, i) => (
          <div key={i} style={{
            padding: "16px 12px", textAlign: "center",
            borderRight: i < 3 ? `1px solid ${c.border}` : "none",
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.text, letterSpacing: "-0.02em" }}>{item.val}</div>
            <div style={{ fontSize: 10, color: c.text4, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", borderBottom: `1px solid ${c.border}` }}>
        {(["plan", "history"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "10px 16px", border: "none", background: "transparent",
            color: tab === t ? c.text : c.text4, fontSize: 12, fontWeight: 600, cursor: "pointer",
            borderBottom: tab === t ? `2px solid ${c.accent}` : "2px solid transparent",
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            {t === "plan" ? "Plan" : `History${history.length ? ` (${history.length})` : ""}`}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "16px 0" }}>
        {tab === "history" ? (
          <div style={{ padding: "0 16px" }}><HistoryView history={history} /></div>
        ) : (
          <>
            {/* Pending tweaks bar */}
            <PendingTweaksBar tweaks={pendingTweaks} onRemove={removeTweak}
              onSend={sendAllTweaks} onClear={() => setPendingTweaks([])} sending={sending} />

            {/* Week pills */}
            <div style={{ display: "flex", gap: 4, padding: "0 16px", marginBottom: 16, overflowX: "auto" }}>
              {plan.map((w: any, wi: number) => (
                <button key={wi} onClick={() => setWeek(wi)} style={{
                  padding: "6px 14px",
                  border: week === wi ? `1px solid ${c.accent}` : `1px solid ${c.border}`,
                  borderRadius: 6,
                  background: week === wi ? c.accentSoft : "transparent",
                  color: week === wi ? c.accent : c.text3,
                  fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
                }}>{w.week}</button>
              ))}
            </div>

            {/* Days */}
            {plan[week] && (plan[week].days || []).map((day: any, di: number) => {
              const rest = !day.exercises?.length || day.day?.toLowerCase().includes("rest");
              const dk = `${week}-${di}`;
              const dp = progress[dk] || {};
              const done = Object.values(dp).filter((p: any) => p?.done).length;
              const total = (day.exercises || []).length;

              return (
                <div key={di} style={{
                  background: c.raised, marginBottom: 8,
                  border: `1px solid ${c.borderSubtle}`,
                  marginLeft: 16, marginRight: 16, borderRadius: 10, overflow: "hidden",
                }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 16px", borderBottom: rest ? "none" : `1px solid ${c.borderSubtle}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: rest ? c.text4 : c.text }}>{day.day}</span>
                      {day.focus && (
                        <span style={{ fontSize: 11, color: c.accent, background: c.accentSoft, padding: "1px 8px", borderRadius: 4 }}>{day.focus}</span>
                      )}
                    </div>
                    {!rest && total > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: done === total ? c.success : c.text4 }}>{done}/{total}</span>
                        <div style={{ width: 48, height: 3, borderRadius: 2, background: c.border, overflow: "hidden" }}>
                          <div style={{
                            width: `${total ? (done / total) * 100 : 0}%`, height: "100%", borderRadius: 2,
                            background: done === total ? c.success : c.accent, transition: "width 0.3s",
                          }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {rest ? (
                    <div style={{ padding: "20px 16px", textAlign: "center", color: c.text4, fontSize: 13 }}>Rest day</div>
                  ) : (
                    <>
                      {(day.exercises || []).map((ex: any, ei: number) => (
                        <ExerciseRow key={ei} ex={ex} idx={ei} dayLabel={day.day}
                          progress={dp[ei]}
                          onUpdate={(i, u) => updateProgress(dk, i, u)}
                          onStage={stageTweak}
                          onOpenVideo={openVideo}
                          hasPendingTweak={tweakSet.has(`${day.day}::${ex.name}`)}
                        />
                      ))}
                      {done > 0 && (
                        <div style={{ padding: "8px 16px 12px" }}>
                          <button onClick={() => save(plan[week].week, day, dk)}
                            disabled={saving === dk}
                            style={{
                              width: "100%", padding: "8px 16px",
                              border: `1px solid ${saving === dk ? c.border : c.accent}`,
                              borderRadius: 6,
                              background: saving === dk ? "transparent" : c.accentSoft,
                              color: saving === dk ? c.text4 : c.accent,
                              fontSize: 12, fontWeight: 600,
                              cursor: saving === dk ? "default" : "pointer",
                            }}>
                            {saving === dk ? "Saving..." : "Save session"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {/* Legend */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "16px 16px 0" }}>
              {Object.entries(muscleColor)
                .filter(([k]) => !["biceps", "triceps", "abs", "glutes", "full body"].includes(k))
                .map(([name, color]) => (
                  <span key={name} style={{
                    display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: c.text4,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
                    {name}
                  </span>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<WorkoutPlanView />);
