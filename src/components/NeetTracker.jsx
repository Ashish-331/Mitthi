import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2, RotateCcw, BookOpen, FlaskConical, Search, LogOut, Flower2, Ribbon, Sparkles, Star, Cloud, Target, Dna, CalendarDays, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import mascotLogo from "../../study_bloom_bunny_mascot_logo.png";
import {
  PHYSICS_CHAPTERS, CHEMISTRY_CHAPTERS, BIOLOGY_CHAPTERS, RACE_STATES, RACE_COLORS,
  chapterId, defaultChapterRow
} from "../lib/chapterData";

const SUBJECT_META = {
  Physics: { accent: "#C92F6D", icon: BookOpen, chapters: PHYSICS_CHAPTERS },
  Chemistry: { accent: "#8D1749", icon: FlaskConical, chapters: CHEMISTRY_CHAPTERS },
  Biology: { accent: "#A84364", icon: Dna, chapters: BIOLOGY_CHAPTERS }
};

const PERIOD_STORAGE_KEY = "study_bloom_period_cycle_v1";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(key) {
  return new Date(`${key}T12:00:00`);
}

function formatPeriodDate(key) {
  return dateFromKey(key).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function PeriodTracker() {
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [cycle, setCycle] = useState({ start: null, end: null });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PERIOD_STORAGE_KEY));
      if (saved && typeof saved.start === "string") {
        setCycle({ start: saved.start, end: typeof saved.end === "string" ? saved.end : null });
        setMonth(new Date(dateFromKey(saved.start).getFullYear(), dateFromKey(saved.start).getMonth(), 1));
      }
    } catch {
      localStorage.removeItem(PERIOD_STORAGE_KEY);
    }
  }, []);

  const saveCycle = (nextCycle) => {
    setCycle(nextCycle);
    if (nextCycle.start) localStorage.setItem(PERIOD_STORAGE_KEY, JSON.stringify(nextCycle));
    else localStorage.removeItem(PERIOD_STORAGE_KEY);
  };

  const selectDay = (key) => {
    if (!cycle.start || cycle.end || key < cycle.start) {
      saveCycle({ start: key, end: null });
      return;
    }
    saveCycle({ start: cycle.start, end: key });
  };

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingDays = new Date(year, monthIndex, 1).getDay();
  const todayKey = dateKey(today);
  const isInRange = (key) => cycle.start && cycle.end && key >= cycle.start && key <= cycle.end;
  const statusText = cycle.start && cycle.end
    ? `${formatPeriodDate(cycle.start)} – ${formatPeriodDate(cycle.end)}`
    : cycle.start ? "Choose the final day" : "Choose the first day";

  return (
    <section className="period-tracker" aria-label="Period calendar">
      <div className="period-copy">
        <div className="period-title"><CalendarDays size={18} /> <span>Period calendar</span></div>
        <p>Tap your first and final day to mark this month.</p>
        <div className={`period-status ${cycle.start ? "has-selection" : ""}`}>
          <span className="period-status-dot" /> {statusText}
        </div>
        <small>Saved privately in this browser.</small>
      </div>

      <div className="period-calendar">
        <div className="calendar-toolbar">
          <button type="button" className="month-button" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} aria-label="Previous month"><ChevronLeft size={18} /></button>
          <strong>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong>
          <button type="button" className="month-button" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} aria-label="Next month"><ChevronRight size={18} /></button>
        </div>
        <div className="weekday-row">{WEEKDAYS.map(day => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">
          {Array.from({ length: leadingDays }, (_, index) => <span key={`blank-${index}`} />)}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;
            const key = dateKey(new Date(year, monthIndex, day));
            const inRange = isInRange(key);
            const isStart = key === cycle.start;
            const isEnd = key === cycle.end;
            return (
              <button
                type="button"
                key={key}
                onClick={() => selectDay(key)}
                className={`period-day ${inRange ? "is-range" : ""} ${isStart ? "is-start" : ""} ${isEnd ? "is-end" : ""} ${key === todayKey ? "is-today" : ""}`}
                style={inRange ? { animationDelay: `${day * 18}ms` } : undefined}
                aria-label={`Select ${formatPeriodDate(key)}`}
              >
                {day}
              </button>
            );
          })}
        </div>
        {cycle.start && <button type="button" className="clear-period" onClick={() => saveCycle({ start: null, end: null })}><X size={14} /> Clear dates</button>}
      </div>
    </section>
  );
}

function buildSkeleton(subject) {
  const map = {};
  SUBJECT_META[subject].chapters.forEach(name => {
    const row = defaultChapterRow(subject, name);
    map[row.id] = row;
  });
  return map;
}

function useCountUp(target, duration = 450) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const frameRef = useRef(null);
  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    if (diff === 0) { setDisplay(target); return; }
    const startTime = performance.now();
    cancelAnimationFrame(frameRef.current);
    function tick(now) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + diff * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
      else prevRef.current = target;
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);
  return display;
}

function Counter({ label, value, onIncrement, onDecrement, accent }) {
  const [bump, setBump] = useState(false);
  const displayVal = useCountUp(value, 380);
  const trigger = (fn) => { fn(); setBump(true); setTimeout(() => setBump(false), 220); };
  return (
    <div className="counter-control" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 64 }}>
      <span className="counter-label" style={{ fontSize: 10, letterSpacing: "0.02em", color: "#A2647D", fontFamily: "'IBM Plex Mono', monospace" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <button className="counter-button" onClick={() => trigger(onDecrement)} style={{
          width: 19, height: 19, borderRadius: 5, border: "1px solid #F0C3D5", background: "#fff",
          color: "#A2647D", fontSize: 13, lineHeight: 1, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease"
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#F0C3D5"; e.currentTarget.style.color = "#A2647D"; }}
        >−</button>
        <span className="counter-value" style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, fontWeight: 600, minWidth: 20,
          textAlign: "center", color: "#64102F", display: "inline-block",
          transform: bump ? "scale(1.28)" : "scale(1)",
          transition: "transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)"
        }}>{displayVal}</span>
        <button className="counter-button" onClick={() => trigger(onIncrement)} style={{
          width: 19, height: 19, borderRadius: 5, border: "1px solid #F0C3D5", background: "#fff",
          color: "#A2647D", fontSize: 13, lineHeight: 1, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease"
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; e.currentTarget.style.background = accent + "14"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#F0C3D5"; e.currentTarget.style.color = "#A2647D"; e.currentTarget.style.background = "#fff"; }}
        >+</button>
      </div>
    </div>
  );
}

function StatusBadge({ status, onClick }) {
  const c = RACE_COLORS[status];
  return (
    <button className="status-badge" onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20,
      border: "none", background: c.bg, color: c.text, fontSize: 11.5, fontWeight: 500,
      cursor: "pointer", transition: "transform 0.15s ease", fontFamily: "inherit", whiteSpace: "nowrap"
    }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {status}
    </button>
  );
}

function MiniStat({ label, value, accent, delay }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), delay); return () => clearTimeout(t); }, [delay]);
  const displayVal = useCountUp(mounted ? value : 0, 650);
  return (
    <div className="mini-stat" style={{ flex: 1, minWidth: 70 }}>
      <div style={{ fontSize: 10.5, color: "#A2647D", marginBottom: 2, fontFamily: "'IBM Plex Mono', monospace" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: accent, fontFamily: "'Playfair Display', serif" }}>{displayVal}</div>
    </div>
  );
}

function SubjectDashboard({ subject, entries }) {
  const meta = SUBJECT_META[subject];
  const Icon = meta.icon;
  const isBiology = subject === "Biology";
  const total = meta.chapters.length;
  const completed = entries.filter(d => d.race === "Completed").length;
  const revisedChapters = entries.filter(d => (d.ncert_revised_count || 0) > 0).length;
  const progressCount = isBiology ? revisedChapters : completed;
  const pct = total ? Math.round((progressCount / total) * 100) : 0;
  const raceRuns = entries.reduce((s, d) => s + (d.race_count || 0), 0);
  const neetPyq = entries.reduce((s, d) => s + (d.neet_pyq_count || 0), 0);
  const jeePyq = entries.reduce((s, d) => s + (d.jee_pyq_count || 0), 0);
  const modulesDone = entries.reduce((s, d) => s + (d.modules_count || 0), 0);
  const ncertRevisions = entries.reduce((s, d) => s + (d.ncert_revised_count || 0), 0);

  return (
    <div className={`dashboard-card ${isBiology ? "biology-dashboard" : ""}`} style={{ background: "rgba(255,255,255,.82)", border: "1px solid rgba(255,255,255,.9)", borderRadius: 19, padding: "16px 18px", flex: 1, minWidth: 260 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <Icon size={15} color={meta.accent} />
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600, color: meta.accent }}>{subject}</span>
        <span style={{ fontSize: 11.5, color: "#AE6B86", marginLeft: "auto", fontFamily: "'IBM Plex Mono', monospace" }}>{progressCount}/{total} chapters</span>
      </div>
      <div style={{ width: "100%", height: 5, background: "#F8D9E5", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: meta.accent, borderRadius: 3, transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)" }} />
      </div>
      <div className="stats-row" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {isBiology ? (
          <MiniStat label="NCERT REVISED" value={ncertRevisions} accent={meta.accent} delay={0} />
        ) : (
          <>
            <MiniStat label="COMPLETE" value={pct} accent={meta.accent} delay={0} />
            <MiniStat label="MODULES" value={modulesDone} accent={meta.accent} delay={60} />
            <MiniStat label="RACE RUNS" value={raceRuns} accent={meta.accent} delay={120} />
            <MiniStat label="NEET PYQ" value={neetPyq} accent={meta.accent} delay={180} />
            <MiniStat label="JEE PYQ" value={jeePyq} accent={meta.accent} delay={240} />
          </>
        )}
      </div>
    </div>
  );
}

function ChapterRow({ data, onUpdate, onDelete, accent }) {
  const [expanded, setExpanded] = useState(false);
  const [localNotes, setLocalNotes] = useState(data.notes || "");
  const [localModules, setLocalModules] = useState(data.modules_text || "");
  const debounceTimer = useRef(null);
  const isBiology = data.subject === "Biology";
  const isChemistry = data.subject === "Chemistry";

  useEffect(() => { setLocalNotes(data.notes || ""); setLocalModules(data.modules_text || ""); }, [data.name]);

  const cycleRace = () => {
    const idx = RACE_STATES.indexOf(data.race);
    const next = RACE_STATES[(idx + 1) % RACE_STATES.length];
    const updates = { race: next };
    if (next === "Completed") {
      updates.race_count = (data.race_count || 0) + 1;
      updates.last_revised = new Date().toISOString();
    }
    onUpdate(updates);
  };

  const markRevisedToday = () => onUpdate({ last_revised: new Date().toISOString() });
  const daysAgo = data.last_revised ? Math.floor((Date.now() - new Date(data.last_revised).getTime()) / 86400000) : null;
  const needsAttention = data.confidence <= 2 || (daysAgo !== null && daysAgo >= 14);

  const handleNotesChange = (v) => {
    setLocalNotes(v);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => onUpdate({ notes: v }), 500);
  };
  const handleModulesTextChange = (v) => {
    setLocalModules(v);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => onUpdate({ modules_text: v }), 500);
  };

  return (
    <div style={{
      border: "1px solid rgba(237,164,194,.42)", borderRadius: 15, marginBottom: 10, background: "rgba(255,255,255,.9)", overflow: "hidden",
      borderLeft: needsAttention ? "3px solid #C92F6D" : "1px solid rgba(237,164,194,.42)"
    }} className={`chapter-card ${isBiology ? "biology-chapter" : ""}`}>
      <div className="chapter-heading" style={{ display: "flex", alignItems: "center", padding: "12px 14px", gap: 10, cursor: "pointer", flexWrap: "wrap" }}
        onClick={() => setExpanded(e => !e)}>
        <ChevronDown size={15} color="#A2647D" style={{
          transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
          transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1)", flexShrink: 0
        }} />
        <div className="chapter-name" style={{ flex: "1 1 160px", minWidth: 140 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600, color: "#65102F" }}>{data.name}</div>
          {!isBiology && data.modules_text && (
            <div style={{ fontSize: 11, color: "#A2647D", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {data.modules_text}
            </div>
          )}
        </div>
        {!isBiology && <div onClick={e => e.stopPropagation()}><StatusBadge status={data.race} onClick={cycleRace} /></div>}
        <div className="chapter-actions" onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {isBiology ? (
            <Counter label="NCERT REVISED" value={data.ncert_revised_count || 0} accent={accent}
              onIncrement={() => onUpdate({ ncert_revised_count: (data.ncert_revised_count || 0) + 1, last_revised: new Date().toISOString() })}
              onDecrement={() => onUpdate({ ncert_revised_count: Math.max(0, (data.ncert_revised_count || 0) - 1) })} />
          ) : (
            <>
              <Counter label="MODULES" value={data.modules_count || 0} accent={accent}
                onIncrement={() => onUpdate({ modules_count: (data.modules_count || 0) + 1 })}
                onDecrement={() => onUpdate({ modules_count: Math.max(0, (data.modules_count || 0) - 1) })} />
              <Counter label="RACE" value={data.race_count || 0} accent={accent}
                onIncrement={() => onUpdate({ race_count: (data.race_count || 0) + 1 })}
                onDecrement={() => onUpdate({ race_count: Math.max(0, (data.race_count || 0) - 1) })} />
              <Counter label="NEET PYQ" value={data.neet_pyq_count || 0} accent={accent}
                onIncrement={() => onUpdate({ neet_pyq_count: (data.neet_pyq_count || 0) + 1 })}
                onDecrement={() => onUpdate({ neet_pyq_count: Math.max(0, (data.neet_pyq_count || 0) - 1) })} />
              <Counter label="JEE PYQ" value={data.jee_pyq_count || 0} accent={accent}
                onIncrement={() => onUpdate({ jee_pyq_count: (data.jee_pyq_count || 0) + 1 })}
                onDecrement={() => onUpdate({ jee_pyq_count: Math.max(0, (data.jee_pyq_count || 0) - 1) })} />
              {isChemistry && <Counter label="NCERT" value={data.ncert_count || 0} accent={accent}
                onIncrement={() => onUpdate({ ncert_count: (data.ncert_count || 0) + 1 })}
                onDecrement={() => onUpdate({ ncert_count: Math.max(0, (data.ncert_count || 0) - 1) })} />}
              {isChemistry && <Counter label="EXEMPLAR" value={data.exemplar_count || 0} accent={accent}
                onIncrement={() => onUpdate({ exemplar_count: (data.exemplar_count || 0) + 1 })}
                onDecrement={() => onUpdate({ exemplar_count: Math.max(0, (data.exemplar_count || 0) - 1) })} />}
            </>
          )}
        </div>
        <button className="delete-chapter" onClick={e => { e.stopPropagation(); onDelete(); }} style={{
          background: "none", border: "none", color: "#D78AAA", cursor: "pointer", padding: 4, flexShrink: 0
        }}
          onMouseEnter={e => e.currentTarget.style.color = "#A51E58"}
          onMouseLeave={e => e.currentTarget.style.color = "#D78AAA"}>
          <Trash2 size={14} />
        </button>
      </div>

      <div style={{
        maxHeight: expanded ? 300 : 0, opacity: expanded ? 1 : 0,
        transition: "max-height 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.25s ease", overflow: "hidden"
      }}>
        <div className="chapter-details" style={{ padding: "4px 14px 16px 41px", borderTop: "1px solid #F9DCE8", display: "flex", flexDirection: "column", gap: 12 }}>
          {!isBiology && (
            <div>
              <label style={{ fontSize: 11, color: "#A2647D", display: "block", marginBottom: 4 }}>Module names / sub-topics</label>
              <input
                value={localModules}
                onChange={e => handleModulesTextChange(e.target.value)}
                placeholder="e.g. Newton's laws, friction, circular motion"
                style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #E0DDD5", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>
          )}
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: 11, color: "#A2647D", display: "block", marginBottom: 4 }}>Confidence</label>
              <div style={{ display: "flex", gap: 4 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => onUpdate({ confidence: n })} style={{
                    width: 22, height: 22, borderRadius: 5, border: "1px solid #F0C3D5",
                    background: n <= data.confidence ? accent : "#fff", cursor: "pointer", transition: "all 0.15s ease"
                  }} />
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#A2647D", display: "block", marginBottom: 4 }}>Last revised</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12.5, color: "#7A3150" }}>
                  {daysAgo === null ? "Never" : daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
                </span>
                {!isBiology && <button onClick={markRevisedToday} style={{
                  fontSize: 11.5, padding: "4px 9px", borderRadius: 6, border: "1px solid #F0C3D5",
                  background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#7A3150"
                }}>
                  <RotateCcw size={11} /> Mark revised
                </button>}
              </div>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#A2647D", display: "block", marginBottom: 4 }}>Notes</label>
            <textarea
              value={localNotes} onChange={e => handleNotesChange(e.target.value)}
              placeholder="Weak points, formula slips, tricky sub-topics..." rows={2}
              style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #E0DDD5", fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NeetTracker({ onLogout }) {
  const [chapters, setChapters] = useState(() => ({ ...buildSkeleton("Physics"), ...buildSkeleton("Chemistry"), ...buildSkeleton("Biology") }));
  const [hydrated, setHydrated] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [subject, setSubject] = useState("Physics");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [newChapterName, setNewChapterName] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  // Load from Supabase, seeding any missing default rows on first run.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data: existingRows, error: fetchErr } = await supabase.from("chapters").select("*");
        if (fetchErr) throw fetchErr;

        const existingIds = new Set((existingRows || []).map(r => r.id));
        const allDefaults = [
          ...PHYSICS_CHAPTERS.map(name => defaultChapterRow("Physics", name)),
          ...CHEMISTRY_CHAPTERS.map(name => defaultChapterRow("Chemistry", name)),
          ...BIOLOGY_CHAPTERS.map(name => defaultChapterRow("Biology", name))
        ];
        const missing = allDefaults.filter(row => !existingIds.has(row.id));

        if (missing.length > 0) {
          const { error: insertErr } = await supabase.from("chapters").upsert(missing, { onConflict: "id", ignoreDuplicates: true });
          if (insertErr) throw insertErr;
        }

        const { data: finalRows, error: finalErr } = await supabase.from("chapters").select("*");
        if (finalErr) throw finalErr;

        if (!cancelled) {
          const map = {};
          finalRows.forEach(row => { map[row.id] = row; });
          setChapters(map);
        }
      } catch (err) {
        console.error("Load failed", err);
        if (!cancelled) setSaveError(true);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const updateChapter = useCallback((id, updates) => {
    setChapters(prev => {
      const merged = { ...prev[id], ...updates };
      const next = { ...prev, [id]: merged };
      supabase.from("chapters").update(updates).eq("id", id).then(({ error }) => {
        if (error) { console.error("Save failed", error); setSaveError(true); }
        else setSaveError(false);
      });
      return next;
    });
  }, []);

  const deleteChapter = useCallback(async (id) => {
    setChapters(prev => { const next = { ...prev }; delete next[id]; return next; });
    const { error } = await supabase.from("chapters").delete().eq("id", id);
    if (error) console.error("Delete failed", error);
  }, []);

  const addChapter = async () => {
    const name = newChapterName.trim();
    if (!name) return;
    const row = defaultChapterRow(subject, name);
    setChapters(prev => ({ ...prev, [row.id]: row }));
    const { error } = await supabase.from("chapters").insert(row);
    if (error) console.error("Add failed", error);
    setNewChapterName("");
    setShowAdd(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("neet_tracker_authed");
    onLogout();
  };

  const subjectChapters = Object.entries(chapters).filter(([, d]) => d.subject === subject);
  const filtered = subjectChapters.filter(([, d]) => {
    if (subject !== "Biology" && filter !== "All" && d.race !== filter) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const physicsEntries = Object.values(chapters).filter(d => d.subject === "Physics");
  const chemEntries = Object.values(chapters).filter(d => d.subject === "Chemistry");
  const bioEntries = Object.values(chapters).filter(d => d.subject === "Biology");
  const completedChapters = [...physicsEntries, ...chemEntries].filter(d => d.race === "Completed").length
    + bioEntries.filter(d => (d.ncert_revised_count || 0) > 0).length;
  const totalChapters = physicsEntries.length + chemEntries.length + bioEntries.length;
  const meta = SUBJECT_META[subject];

  return (
    <div className="tracker-shell" style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", minHeight: "100vh", padding: "32px 20px", color: "#55102e" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Quicksand:wght@500;600;700&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
        .tracker-shell { position: relative; overflow: hidden; isolation: isolate; background-color: #fff7f9; background-image: radial-gradient(#ffd4df 1px, transparent 1px), radial-gradient(#eadff9 1px, #fff7f9 1px); background-size: 40px 40px; background-position: 0 0, 20px 20px; }
        .tracker-shell::before, .tracker-shell::after { content: ''; position: absolute; z-index: -1; border-radius: 999px; pointer-events: none; filter: blur(2px); }
        .tracker-shell::before { width: 370px; height: 370px; left: -210px; bottom: -100px; background: rgba(209,48,111,.12); }
        .tracker-shell::after { width: 520px; height: 520px; right: -290px; top: -210px; background: rgba(255,255,255,.8); }
        .tracker-content { animation: page-in .7s cubic-bezier(.22, 1, .36, 1) both; }
        .main-header { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 20px; }
        .brand-lockup { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .brand-mascot { width: 59px; height: 59px; flex: 0 0 auto; overflow: hidden; padding: 3px; border-radius: 19px; background: linear-gradient(135deg, #ff8fab, #ff4d6d); box-shadow: 0 7px 17px rgba(255,143,171,.28); transition: transform .2s ease; }
        .brand-mascot:hover { transform: rotate(-4deg) scale(1.05); }
        .brand-mascot img { width: 100%; height: 100%; object-fit: cover; border-radius: 15px; background: #fff; }
        .brand-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border: 1px solid #ffe5ec; border-radius: 999px; color: #ff4d6d; background: #fff0f3; font: 700 10px/1 'Quicksand', sans-serif; letter-spacing: .07em; }
        .brand-badge small { margin-left: 3px; color: #8d7b85; letter-spacing: 0; }
        .brand-title { margin: 5px 0 0; color: #3d2f36; font: 700 clamp(22px, 4vw, 31px)/1.05 'Quicksand', sans-serif; letter-spacing: -.04em; }
        .brand-subtitle { margin: 5px 0 0; color: #5a4a52; font-size: 13px; font-weight: 700; }
        .header-actions { display: flex; align-items: center; gap: 9px; }
        .sync-pill { display: inline-flex; align-items: center; gap: 6px; padding: 7px 11px; border: 1px solid #ffe5ec; border-radius: 999px; background: rgba(255,255,255,.82); box-shadow: 0 3px 8px rgba(255,143,171,.08); color: #5a4a52; font: 700 11px 'Quicksand', sans-serif; }
        .sync-dot { width: 7px; height: 7px; border-radius: 50%; background: #6fcf8d; box-shadow: 0 0 0 0 rgba(111,207,141,.4); animation: sync-pulse 1.8s infinite; }
        .logout-button { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border: 1px solid #ffe5ec; border-radius: 999px; color: #5a4a52; background: #fff; box-shadow: 0 3px 8px rgba(255,143,171,.08); cursor: pointer; font: 700 11px 'Quicksand', sans-serif; }
        .logout-button:hover { color: #ff4d6d; background: #fff0f3; }
        .period-tracker { display: grid; grid-template-columns: minmax(220px, .8fr) minmax(340px, 1.2fr); gap: 22px; align-items: center; margin-bottom: 20px; padding: 18px 20px; overflow: hidden; position: relative; border: 2px solid #ffe5ec; border-radius: 24px; background: linear-gradient(112deg, #fff0f5 0%, #fff 52%, #f9efff 100%); box-shadow: 0 7px 18px rgba(255,143,171,.12); }
        .period-tracker::after { content: ''; width: 170px; height: 170px; position: absolute; right: -76px; bottom: -95px; border-radius: 50%; background: rgba(255,143,171,.11); pointer-events: none; }
        .period-copy { position: relative; z-index: 1; }
        .period-title { display: flex; align-items: center; gap: 8px; color: #8d1749; font: 700 18px 'Quicksand', sans-serif; }
        .period-title svg { color: #e2508a; }
        .period-copy p { margin: 5px 0 12px; color: #6d5260; font-size: 12px; font-weight: 700; }
        .period-copy small { display: block; margin-top: 10px; color: #a46c82; font-size: 10px; font-weight: 700; }
        .period-status { display: inline-flex; align-items: center; gap: 7px; padding: 7px 10px; border: 1px solid #f7cbdc; border-radius: 999px; color: #9b5872; background: rgba(255,255,255,.76); font: 700 11px 'Quicksand', sans-serif; transition: color .2s ease, background .2s ease, box-shadow .2s ease; }
        .period-status.has-selection { color: #8d1749; background: #fff; box-shadow: 0 4px 10px rgba(217,82,136,.12); }
        .period-status-dot { width: 7px; height: 7px; border-radius: 50%; background: #e8a4bd; }
        .period-status.has-selection .period-status-dot { background: #e2508a; animation: period-pulse 1.8s ease-in-out infinite; }
        .period-calendar { position: relative; z-index: 1; padding: 11px; border: 1px solid rgba(255,255,255,.9); border-radius: 18px; background: rgba(255,255,255,.82); box-shadow: inset 0 1px 0 #fff; }
        .calendar-toolbar { display: grid; grid-template-columns: 36px 1fr 36px; align-items: center; margin-bottom: 8px; text-align: center; color: #6d2348; font: 700 13px 'Quicksand', sans-serif; }
        .month-button { display: grid; width: 34px; height: 34px; place-items: center; border: 1px solid #f6c8d9; border-radius: 11px; color: #b33268; background: #fff8fb; cursor: pointer; }
        .month-button:hover { color: #fff; background: #e2508a; border-color: #e2508a; }
        .weekday-row, .calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px; }
        .weekday-row { margin-bottom: 4px; color: #b27990; font: 700 9px 'Quicksand', sans-serif; text-align: center; text-transform: uppercase; }
        .period-day { min-width: 0; min-height: 35px; position: relative; border: 0; border-radius: 10px; color: #6d5260; background: transparent; cursor: pointer; font: 700 12px 'Quicksand', sans-serif; transition: transform .2s cubic-bezier(.34,1.56,.64,1), background .2s ease, color .2s ease, box-shadow .2s ease; }
        .period-day:hover { background: #fff0f5; color: #b32d65; transform: translateY(-1px); }
        .period-day.is-today { box-shadow: inset 0 0 0 1px #e8a4bd; }
        .period-day.is-range { color: #9f2458; background: #ffdce9; animation: range-pop .42s cubic-bezier(.34,1.56,.64,1) both; }
        .period-day.is-start, .period-day.is-end { z-index: 1; color: #fff; background: linear-gradient(135deg, #ff8fab, #b32d65); box-shadow: 0 5px 10px rgba(198,53,108,.27); }
        .period-day.is-start::after, .period-day.is-end::after { content: ''; position: absolute; width: 7px; height: 7px; top: 4px; right: 4px; border-radius: 50%; background: rgba(255,255,255,.8); }
        .clear-period { display: inline-flex; align-items: center; gap: 5px; margin: 8px 0 0 auto; padding: 4px 7px; border: 0; color: #a2657d; background: transparent; cursor: pointer; font: 700 10px 'Quicksand', sans-serif; }
        .clear-period:hover { color: #b32d65; }
        .cheer-banner { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; padding: 15px 18px; border: 2px solid #ffe5ec; border-radius: 24px; background: linear-gradient(90deg, #fff0f3, #fff, #f4efff); box-shadow: 0 5px 14px rgba(255,143,171,.11); }
        .cheer-copy { display: flex; align-items: center; gap: 12px; }
        .cheer-mascot { width: 46px; height: 46px; flex: 0 0 auto; padding: 2px; overflow: hidden; border: 1px solid #ffe5ec; border-radius: 50%; background: #fff; box-shadow: inset 0 2px 4px rgba(255,182,201,.2); animation: gentle-float 4s ease-in-out infinite; }
        .cheer-mascot img { width: 100%; height: 100%; border-radius: inherit; object-fit: cover; }
        .cheer-eyebrow { display: flex; align-items: center; gap: 5px; margin-bottom: 3px; color: #ff4d6d; font: 700 10px 'Quicksand', sans-serif; letter-spacing: .07em; text-transform: uppercase; }
        .cheer-text { margin: 0; color: #3d2f36; font: 700 14px/1.35 'Quicksand', sans-serif; }
        .target-callout { display: inline-flex; align-items: center; gap: 7px; padding: 9px 12px; border: 1px solid #ffe5ec; border-radius: 14px; background: rgba(255,255,255,.9); color: #5a4a52; white-space: nowrap; font-size: 11px; font-weight: 700; }
        .target-callout strong { color: #ff4d6d; }
        .dashboard-card { box-shadow: 0 8px 24px rgba(255,143,171,.16); transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; backdrop-filter: blur(14px); background: #fffdfE !important; border: 2px solid #ffe5ec !important; border-radius: 24px !important; }
        .dashboard-card:hover { transform: translateY(-3px); border-color: #ff8fab !important; box-shadow: 0 14px 29px rgba(255,143,171,.2); }
        .chapter-card { box-shadow: 0 5px 15px rgba(137, 22, 71, .055); transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease; }
        .chapter-card:hover { transform: translateY(-2px); border-color: rgba(201,47,109,.56) !important; box-shadow: 0 12px 24px rgba(137, 22, 71, .10); }
        .tracker-shell input, .tracker-shell textarea { border-color: #f0c3d5 !important; background: rgba(255,255,255,.82); transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease; }
        .tracker-shell input:focus, .tracker-shell textarea:focus { border-color: #cb3671 !important; outline: none; box-shadow: 0 0 0 4px rgba(203,54,113,.12); transform: translateY(-1px); }
        .tracker-shell button { transition: transform .18s ease, box-shadow .18s ease, filter .18s ease; }
        .tracker-shell button:active { transform: scale(.96); }
        .tracker-shell button:focus { outline: 2px solid #c92f6d; outline-offset: 2px; }
        .filter-chip-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .page-flower, .page-star, .page-sparkle { position: absolute; z-index: -1; color: #c92f6d; opacity: .48; pointer-events: none; animation: gentle-float 5s ease-in-out infinite; }
        .page-star { color: #e45b91; opacity: .65; animation-delay: -1.8s; }
        .page-sparkle { color: #951744; opacity: .48; animation-delay: -3.2s; }
        @keyframes page-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes gentle-float { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-10px) rotate(9deg); } }
        @keyframes sync-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(111,207,141,.35); } 50% { box-shadow: 0 0 0 5px rgba(111,207,141,0); } }
        @keyframes period-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(226,80,138,.32); } 50% { box-shadow: 0 0 0 5px rgba(226,80,138,0); } }
        @keyframes range-pop { from { opacity: 0; transform: scale(.65); } to { opacity: 1; transform: scale(1); } }
        @media (max-width: 660px) {
          .tracker-shell { min-height: 100dvh !important; padding: max(14px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(28px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)) !important; }
          .main-header { position: sticky; top: 0; z-index: 10; align-items: flex-start; flex-direction: column; margin: -4px -4px 16px; padding: 10px 4px 12px; background: linear-gradient(180deg, rgba(255,247,249,.97) 75%, rgba(255,247,249,0)); backdrop-filter: blur(10px); }
          .brand-lockup { gap: 10px; }
          .brand-mascot { width: 50px; height: 50px; border-radius: 16px; }
          .brand-mascot img { border-radius: 12px; }
          .brand-title { font-size: 22px; }
          .brand-subtitle { font-size: 11px; line-height: 1.35; }
          .header-actions { width: 100%; justify-content: space-between; }
          .sync-pill, .logout-button { min-height: 40px; padding: 8px 13px; font-size: 12px; }
          .cheer-banner { align-items: flex-start; flex-direction: column; gap: 12px; padding: 14px; border-radius: 20px; }
          .cheer-copy { align-items: flex-start; }
          .cheer-mascot { width: 42px; height: 42px; }
          .cheer-text { font-size: 13px; }
          .target-callout { align-self: stretch; min-height: 42px; justify-content: center; white-space: normal; text-align: center; }
          .period-tracker { grid-template-columns: 1fr; gap: 14px; padding: 15px; border-radius: 20px; }
          .period-copy p { margin-bottom: 9px; }
          .period-copy small { display: none; }
          .period-calendar { padding: 10px; }
          .period-day { min-height: 40px; font-size: 13px; }
          .month-button { width: 38px; height: 38px; }
          .dashboard-card { min-width: 100% !important; padding: 15px !important; border-radius: 20px !important; }
          .stats-row { display: grid !important; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px !important; }
          .biology-dashboard .stats-row { grid-template-columns: minmax(0, 1fr); }
          .mini-stat { min-width: 0 !important; text-align: center; }
          .mini-stat > div:first-child { font-size: 8px !important; white-space: nowrap; }
          .mini-stat > div:last-child { font-size: 17px !important; }
          .subject-tabs { display: flex !important; width: 100%; margin-bottom: 13px !important; }
          .subject-tab { flex: 1; justify-content: center; min-height: 42px; font-size: 14px !important; }
          .filter-bar { display: block !important; margin-bottom: 12px !important; }
          .filter-chip-row { flex-wrap: nowrap; overflow-x: auto; overscroll-behavior-x: contain; padding: 2px 1px 9px; margin: 0 -2px 3px; scrollbar-width: none; }
          .filter-chip-row::-webkit-scrollbar { display: none; }
          .filter-chip { min-height: 38px; flex: 0 0 auto; padding: 7px 13px !important; font-size: 12px !important; white-space: nowrap; }
          .chapter-search { width: 100%; margin-left: 0 !important; }
          .chapter-search input { height: 45px; padding-left: 34px !important; font-size: 16px !important; }
          .chapter-heading { padding: 14px 12px !important; gap: 9px !important; }
          .chapter-name { flex-basis: calc(100% - 36px) !important; min-width: 0 !important; }
          .status-badge { min-height: 38px; padding: 7px 11px !important; font-size: 12px !important; }
          .chapter-actions { width: 100%; display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 8px !important; padding-top: 7px; }
          .biology-chapter .chapter-actions { grid-template-columns: minmax(0, 1fr); }
          .counter-control { min-width: 0 !important; gap: 5px !important; padding: 8px 4px; border: 1px solid #f9dce8; border-radius: 13px; background: #fffafd; }
          .counter-control > div { justify-content: center; }
          .counter-label { font-size: 8px !important; white-space: nowrap; }
          .counter-button { width: 33px !important; height: 33px !important; border-radius: 10px !important; font-size: 17px !important; }
          .counter-value { min-width: 18px !important; font-size: 16px !important; }
          .delete-chapter { position: absolute; right: 12px; min-width: 38px; min-height: 38px; border-radius: 10px !important; }
          .chapter-heading { position: relative; padding-right: 52px !important; }
          .chapter-details { padding: 8px 13px 17px !important; gap: 14px !important; }
          .chapter-details input, .chapter-details textarea { min-height: 44px; font-size: 16px !important; }
          .add-chapter-panel { display: grid !important; grid-template-columns: 1fr 1fr; gap: 8px !important; }
          .add-input { grid-column: 1 / -1; min-height: 46px; font-size: 16px !important; }
          .add-submit, .add-cancel, .add-trigger { min-height: 44px; justify-content: center; font-size: 13px !important; }
          .add-trigger { width: 100%; }
          .page-flower { top: 240px !important; left: -16px !important; opacity: .22; }
          .page-star { top: 90px !important; right: 4px !important; opacity: .35; }
          .page-sparkle { bottom: 35px !important; right: 8px !important; opacity: .3; }
        }
        @media (prefers-reduced-motion: reduce) { .tracker-content, .page-flower, .page-star, .page-sparkle, .cheer-mascot, .sync-dot, .period-status.has-selection .period-status-dot, .period-day.is-range { animation: none; } .dashboard-card:hover, .chapter-card:hover { transform: none; } }
      `}</style>

      <Flower2 className="page-flower" size={64} strokeWidth={1} style={{ top: 102, left: "4%" }} />
      <Star className="page-star" size={23} fill="currentColor" strokeWidth={0} style={{ top: 155, right: "7%" }} />
      <Sparkles className="page-sparkle" size={36} strokeWidth={1.3} style={{ bottom: 78, right: "5%" }} />
      <div className="tracker-content" style={{ maxWidth: 1120, margin: "0 auto" }}>
        <header className="main-header">
          <div className="brand-lockup">
            <div className="brand-mascot"><img src={mascotLogo} alt="Study Bloom bunny mascot" /></div>
            <div>
              <div className="brand-badge"><Flower2 size={13} strokeWidth={2} /><Ribbon size={13} strokeWidth={2} /> STUDY BLOOM</div>
              <h1 className="brand-title">Bhargavi&apos;s NEET Tracker</h1>
              <p className="brand-subtitle">Physics &amp; Chemistry — study progress, revisions &amp; PYQs</p>
            </div>
          </div>
          <div className="header-actions">
            <div className="sync-pill"><span className="sync-dot" /> <span>{saveError ? "Needs attention" : hydrated ? "Saved" : "Saving"}</span><Cloud size={14} strokeWidth={2} /></div>
            <button className="logout-button" onClick={handleLogout}><LogOut size={14} /> Log out</button>
          </div>
        </header>

        <PeriodTracker />

        <section className="cheer-banner">
          <div className="cheer-copy">
            <div className="cheer-mascot"><img src={mascotLogo} alt="Study Bloom mascot" /></div>
            <div>
              <div className="cheer-eyebrow"><Sparkles size={13} /> A little cheer for you</div>
              <p className="cheer-text">Keep going, Bhargavi! You&apos;re doing amazing. ({completedChapters}/{totalChapters} completed)</p>
            </div>
          </div>
          <div className="target-callout"><Target size={16} color="#ff4d6d" /><span>Today&apos;s target:</span> <strong>2 race runs &amp; 10 PYQs</strong></div>
        </section>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <SubjectDashboard subject="Physics" entries={physicsEntries} />
          <SubjectDashboard subject="Chemistry" entries={chemEntries} />
          <SubjectDashboard subject="Biology" entries={bioEntries} />
        </div>

        <div className="subject-tabs" style={{ display: "inline-flex", background: "rgba(247,206,222,.68)", borderRadius: 12, padding: 3, marginBottom: 16, border: "1px solid rgba(255,255,255,.75)" }}>
          {["Physics", "Chemistry", "Biology"].map(s => {
            const Icon = SUBJECT_META[s].icon;
            const active = subject === s;
            return (
              <button className="subject-tab" key={s} onClick={() => setSubject(s)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, border: "none",
                background: active ? "#fff" : "transparent", color: active ? SUBJECT_META[s].accent : "#9F607A",
                fontWeight: active ? 600 : 400, fontSize: 13.5, cursor: "pointer",
                boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none", transition: "all 0.2s ease", fontFamily: "inherit"
              }}>
                <Icon size={14} /> {s}
              </button>
            );
          })}
        </div>

        <div className="filter-bar" style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          {subject !== "Biology" && <div className="filter-chip-row">
            {["All", ...RACE_STATES].map(f => (
              <button className="filter-chip" key={f} onClick={() => setFilter(f)} style={{
                padding: "5px 11px", borderRadius: 20, fontSize: 12,
                border: `1px solid ${filter === f ? meta.accent : "#F0C3D5"}`,
                background: filter === f ? meta.accent : "#fff",
                color: filter === f ? "#fff" : "#7A3150",
                cursor: "pointer", transition: "all 0.15s ease", fontFamily: "inherit"
              }}>{f}</button>
            ))}
          </div>}
          <div className="chapter-search" style={{ flex: 1, minWidth: 140, position: "relative", marginLeft: "auto" }}>
            <Search size={13} color="#C07B98" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chapter..."
              style={{ width: "100%", padding: "7px 10px 7px 30px", borderRadius: 8, border: "1px solid #E0DDD5", fontSize: 12.5, fontFamily: "inherit" }} />
          </div>
        </div>

        <div>
          {filtered
            .sort((a, b) => SUBJECT_META[subject].chapters.indexOf(a[1].name) - SUBJECT_META[subject].chapters.indexOf(b[1].name))
            .map(([id, data]) => (
              <ChapterRow key={id} data={data} accent={meta.accent}
                onUpdate={updates => updateChapter(id, updates)}
                onDelete={() => deleteChapter(id)} />
            ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#C07B98", fontSize: 13 }}>No chapters match this filter.</div>
          )}
        </div>

        <div className="add-chapter-area" style={{ marginTop: 12 }}>
          {showAdd ? (
            <div className="add-chapter-panel" style={{ display: "flex", gap: 8 }}>
              <input value={newChapterName} onChange={e => setNewChapterName(e.target.value)}
                placeholder="Chapter name to add" onKeyDown={e => e.key === "Enter" && addChapter()} autoFocus
                className="add-input" style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #F0C3D5", fontSize: 13, fontFamily: "inherit" }} />
              <button className="add-submit" onClick={addChapter} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: meta.accent, color: "#fff", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Add</button>
              <button className="add-cancel" onClick={() => { setShowAdd(false); setNewChapterName(""); }} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #F0C3D5", background: "#fff", color: "#7A3150", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            </div>
          ) : (
            <button className="add-trigger" onClick={() => setShowAdd(true)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
              border: "1px dashed #D786A7", background: "rgba(255,255,255,.5)", color: "#9F4269", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit"
            }}>
              <Plus size={14} /> Add a chapter I missed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
