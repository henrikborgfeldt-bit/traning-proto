import { useState, useEffect, useMemo, useRef } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, Scatter, ScatterChart, CartesianGrid, Cell } from "recharts";

// ==========================================
// 1. KONSTANTER OCH HJÄLPFUNKTIONER (Utanför komponenten)
// ==========================================
const NOW = new Date();
const M = { fontFamily: "'DM Mono',monospace" };
const iC = { easy: "#40A878", threshold: "#C85A9C", interval: "#DC6444", long: "#5070DC", race: "#F0B428" };

const COORDS = {
  "Stockholm": { lat: 59.337, lng: 18.068 },
  "Göteborg": { lat: 57.708, lng: 11.975 },
  "Linköping": { lat: 58.411, lng: 15.625 },
  "Puerto de la Cruz": { lat: 28.414, lng: -16.548 },
  "Kristianstad": { lat: 56.031, lng: 14.157 },
  "Håbo": { lat: 59.564, lng: 17.528 },
  "Vamos": { lat: 35.413, lng: 24.204 },
};

const CAT = {
  race: { l: "Tävling", c: "#F0B428", d: "Officiellt lopp. Snittpuls >170." },
  test: { l: "Test", c: "#E08040", d: "Tidstest (5K/3K PB). Maximal ansträngning." },
  interval: { l: "Intervall", c: "#DC6444", d: "Korta repetitioner (400m–2km) med vila. Bygger VO₂max." },
  threshold: { l: "Tröskel", c: "#C85A9C", d: "Längre intervaller (6–10 min) nära tröskeln. Bygger uthållighetsfart." },
  long: { l: "Långpass", c: "#5070DC", d: "Pass >15 km. Bygger aerob bas." },
  easy: { l: "Lugn", c: "#40A878", d: "Lätt löpning. Snittpuls <148. Återhämtning." },
  moderate: { l: "Medel", c: "#60B8A0", d: "Medelhög intensitet." },
};

const PLAN = [
  { w: "V26", d: "22–28 jun", f: "Bas + terrängintro", km: 52, pct: { easy: 55, threshold: 15, interval: 15, long: 15 }, days: "Mån: Lugn 8km · Tis: 6×1km@3:50/90s · Ons: Styrka · Tor: Lugn 8km terräng · Fre: Vila · Lör: Backpass 8×90s+10km · Sön: Långpass 20km" },
  { w: "V27–28", d: "jun/jul", f: "Volymbygge + backar", km: 58, pct: { easy: 50, threshold: 20, interval: 10, long: 20 }, days: "Mån: Lugn 9km · Tis: 3×10min@4:10/2min · Ons: Styrka · Tor: Lugn 10km terräng · Fre: Vila · Lör: 5×4min backintervall · Sön: Långpass 22–24km kuperat" },
  { w: "V29–32", d: "jul/aug", f: "Lidingö-specifik", km: 62, pct: { easy: 45, threshold: 20, interval: 15, long: 20 }, days: "Mån: Lugn 9km · Tis: 4×8min@4:10/2min · Ons: Styrka lätt · Tor: Lugn 10km stigar · Fre: Vila · Lör: Lidingöbanan! · Sön: Progressivt 25–28km" },
  { w: "V33–36", d: "aug/sep", f: "Toppform", km: 60, pct: { easy: 45, threshold: 25, interval: 15, long: 15 }, days: "Mån: Lugn 8km · Tis: 6×2km@3:55/2min · Ons: Lugn 6km+stegringar · Tor: 2×20min@4:15 · Fre: Vila · Lör: Lidingöbanan sista milen · Sön: Sista långa 28–30km" },
  { w: "V37–38", d: "sep", f: "Taper", km: 35, pct: { easy: 65, threshold: 10, interval: 15, long: 10 }, days: "Mån: Lugn 7km · Tis: 5×1km@3:50/90s · Ons: Vila · Tor: Lugn 5km+stegringar · Fre: Vila · Lör: Shakeout 3km · Sön: Vila" },
  { w: "V39", d: "21–26 sep", f: "RACE WEEK", km: 25, pct: { easy: 60, interval: 10, race: 30 }, days: "Mån: Shakeout 4km · Tis: 3×800m@3:45 · Ons: Vila · Tor: Shakeout 3km · Fre: Vila · Lör: 🏁 LIDINGÖLOPPET 30K" },
];

const PACE = [
  { km: "Start–5", p: "4:10–4:15", t: "~21:00", n: "LUGN start. Puls <165." },
  { km: "5–10", p: "4:05–4:10", t: "~41:30", n: "Hitta rytmen. Drick vid ~5.5km." },
  { km: "10–15", p: "4:00–4:05", t: "~1:01:30", n: "Halvvägs. Gel vid km 12." },
  { km: "15–20", p: "4:00–4:05", t: "~1:21:30", n: "Grönsta. Drick!" },
  { km: "20–25", p: "4:00", t: "~1:41:30", n: "TUFFAST. Abborrbacken ~km 25." },
  { km: "25–28", p: "3:55", t: "~1:53:15", n: "🔥 Öka! Utför efter Abborrbacken." },
  { km: "28–30", p: "3:50", t: "~2:00:55", n: "🚀 ALLT UT!" },
];

function getCoords(name) { 
  for (const [k, v] of Object.entries(COORDS)) if (name.includes(k)) return v; 
  return COORDS.Stockholm; 
}

function fmt(s) { 
  const m = Math.floor(s / 60), ss = Math.floor(s % 60); 
  return `${m}:${ss < 10 ? '0' : ''}${ss}`; 
}

function fmtP(d, s) { 
  if (!d) return "--"; 
  const p = s / (d / 1000); 
  const m = Math.floor(p / 60), ss = Math.floor(p % 60); 
  return `${m}:${ss < 10 ? '0' : ''}${ss}`; 
}

function isoW(ds) { 
  const d = new Date(ds + "T12:00:00"); 
  const t = new Date(d); 
  t.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3); 
  const y = new Date(t.getFullYear(), 0, 4); 
  const w = 1 + Math.round(((t - y) / 864e5 - (y.getDay() + 6) % 7 + 3) / 7); 
  return `${t.getFullYear()}-W${w < 10 ? '0' : ''}${w}`; 
}

function wkMon(ds) { 
  const d = new Date(ds + "T12:00:00"); 
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); 
  return d.toISOString().slice(5, 10); 
}

function paceTick(v) { 
  const m = Math.floor(v), s = Math.round((v % 1) * 60); 
  return `${m}:${s < 10 ? '0' : ''}${s}`; 
}

function SplitTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload; if (!d) return null;
  return (
    <div style={{ background: "#1A1C24", border: "1px solid #2A2D35", borderRadius: 6, padding: "6px 10px", fontSize: 10, color: "#DCE1EB" }}>
      <div style={{ fontWeight: 600 }}>Km {d.km}</div>
      <div style={{ color: "#5070DC" }}>Tempo: {d.paceStr}/km</div>
      <div style={{ color: "#DC6444" }}>Puls: {d.hr} bpm</div>
      <div style={{ color: "#40A878" }}>Höjdmeter: ↑{d.eg}m</div>
      <div style={{ color: "#8C919B" }}>Kadens: {d.cad} spm</div>
    </div>
  );
}

function AeroTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload; if (!d) return null;
  return (
    <div style={{ background: "#1A1C24", border: "1px solid #2A2D35", borderRadius: 6, padding: "6px 10px", fontSize: 10, color: "#DCE1EB" }}>
      <div style={{ fontWeight: 600 }}>{d.date} — {d.name}</div>
      <div>{d.km}km · {paceTick(d.pace)}/km · HR {d.hr}</div>
    </div>
  );
}


// ==========================================
// 2. HUVUDKOMPONENT
// ==========================================
export default function App() {
  const [tab, setTab] = useState("activities");
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState("all");
  const [legend, setLegend] = useState(null);
  const [expW, setExpW] = useState(-1);
  const [showHist, setShowHist] = useState(false);
  const [expHist, setExpHist] = useState(null);
  const [msgs, setMsgs] = useState([{ role: "assistant", content: "Hej! Fråga mig om din träning." }]);
  const [chatIn, setChatIn] = useState("");
  const [chatL, setChatL] = useState(false);
  const chatE = useRef(null);

  // States för backend-data
  const [dbActivities, setDbActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hämta data från Render
  useEffect(() => {
    fetch("https://training-backend-4xfk.onrender.com/api/activities?limit=100")
      .then(res => res.json())
      .then(data => {
        setDbActivities(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Kunde inte hämta pass:", err);
        setIsLoading(false);
      });
  }, []);

  // Formatera datan för appen
  const acts = useMemo(() => {
    return dbActivities.map(dbRow => {
      const dm = dbRow.distance_m || 0;
      const ds = dbRow.duration_s || 0;
      const hr = dbRow.avg_hr || 0;
      const mhr = dbRow.max_hr || 0;
      const spd = dm > 0 && ds > 0 ? dm / ds : 0;
      
      return {
        id: dbRow.garmin_id.toString(),
        date: dbRow.date,
        name: dbRow.name,
        dm: dm,
        ds: ds,
        hr: hr,
        mhr: mhr,
        el: dbRow.elev_gain || 0,
        type: dbRow.category || "easy",
        gid: dbRow.garmin_id,
        km: +(dm / 1000).toFixed(1),
        pace: fmtP(dm, ds),
        time: fmt(ds),
        spd: spd,
        eff: dbRow.aero_efficiency || (hr > 0 && spd > 0 ? +((spd / hr) * 1000).toFixed(2) : null),
        splits: null // Null tills vi hämtar dem
      };
    });
  }, [dbActivities]);

  const filtered = filter === "all" ? acts : acts.filter(a => a.type === filter);

  // Veckovolym
  const wkData = useMemo(() => {
    const wks = {};
    acts.forEach(a => { 
      const d = new Date(a.date + "T12:00:00"); 
      if ((NOW - d) / 864e5 > 12 * 7) return; 
      const w = isoW(a.date); 
      if (!wks[w]) wks[w] = { wk: w, km: 0, mon: wkMon(a.date) }; 
      wks[w].km += a.km; 
    });
    const s = Object.values(wks).sort((a, b) => a.wk.localeCompare(b.wk));
    return s.map((w, i) => { 
      const sl = s.slice(Math.max(0, i - 3), i + 1); 
      w.avg = +(sl.reduce((sum, x) => sum + x.km, 0) / sl.length).toFixed(1); 
      w.km = +w.km.toFixed(1); 
      return w; 
    });
  }, [acts]);

  // Plan history
  const histWeeks = useMemo(() => {
    const wks = {};
    acts.forEach(a => {
      const w = isoW(a.date);
      if (!wks[w]) wks[w] = { wk: w, km: 0, mon: wkMon(a.date), date: a.date, cats: {}, totalDur: 0, acts: [] };
      wks[w].km += a.km;
      wks[w].totalDur += a.ds;
      wks[w].cats[a.type] = (wks[w].cats[a.type] || 0) + a.ds;
      wks[w].acts.push(a);
    });
    return Object.values(wks).sort((a, b) => a.wk.localeCompare(b.wk)).map(w => {
      const pct = {};
      for (const [k, v] of Object.entries(w.cats)) {
        if (k === "strength") continue;
        pct[k] = Math.round((v / (w.totalDur || 1)) * 100);
      }
      return { ...w, pct, km: +w.km.toFixed(1) };
    });
  }, [acts]);

  // Aero scatter
  const aeroRuns = useMemo(() => {
    return acts.filter(a => a.type === "easy" && a.km >= 5 && a.hr > 0 && a.spd > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(a => {
        const paceS = a.ds / (a.dm / 1000);
        const paceMK = +(paceS / 60).toFixed(2);
        const weeksAgo = Math.floor((NOW - new Date(a.date + "T12:00:00")) / 604800000);
        const color = weeksAgo <= 4 ? "#5090F0" : weeksAgo <= 8 ? "#F0B428" : weeksAgo <= 12 ? "#DC6444" : "#586070";
        const label = weeksAgo <= 4 ? "0–4v" : weeksAgo <= 8 ? "5–8v" : weeksAgo <= 12 ? "9–12v" : ">12v";
        return { date: a.date, name: a.name, km: a.km, pace: paceMK, hr: a.hr, eff: a.eff, color, label, weeksAgo };
      });
  }, [acts]);

  // Aero line
  const aeroLine = useMemo(() => aeroRuns.map((a, i) => {
    const sl = aeroRuns.slice(Math.max(0, i - 9), i + 1);
    const tp = +(a.pace * a.hr / 1000).toFixed(3);
    const trendTp = +(sl.reduce((sum, x) => sum + (x.pace * x.hr / 1000), 0) / sl.length).toFixed(3);
    return { 
      ...a, 
      idx: a.date.slice(5), 
      tp, 
      trendTp, 
      trendPace: +(sl.reduce((sum, x) => sum + x.pace, 0) / sl.length).toFixed(2), 
      trendHr: +(sl.reduce((sum, x) => sum + x.hr, 0) / sl.length).toFixed(0) 
    };
  }), [aeroRuns]);

  // AI Coach API
  const sendChat = async () => {
    if (!chatIn.trim() || chatL) return;
    const u = chatIn.trim();
    setChatIn("");
    
    const newHistory = [...msgs, { role: "user", content: u }];
    setMsgs(newHistory);
    setChatL(true);

    try {
      const res = await fetch("https://training-backend-4xfk.onrender.com/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: u, history: msgs })
      });
      const data = await res.json();
      setMsgs([...newHistory, { role: "assistant", content: data.reply }]);
    } catch (err) {
      console.error(err);
      setMsgs([...newHistory, { role: "assistant", content: "Kunde inte nå servern. Kontrollera anslutningen." }]);
    } finally {
      setChatL(false);
    }
  };

  useEffect(() => { chatE.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const totalKm = acts.filter(a => a.date >= "2026-01-01").reduce((sum, a) => sum + a.km, 0);
  const races = acts.filter(a => a.type === "race");
  const daysLeft = Math.ceil((new Date("2026-09-26") - NOW) / 864e5);

  const tabs = [
    { id: "activities", l: "Aktiviteter", i: "📋" },
    { id: "volume", l: "Volym", i: "📊" },
    { id: "aero", l: "Effektivitet", i: "❤️" },
    { id: "plan", l: "Plan", i: "📅" },
    { id: "race", l: "Lopp", i: "🏁" },
    { id: "strategy", l: "Tempo", i: "⚡" },
    { id: "chat", l: "Coach", i: "💬" }
  ];

  const renderDetail = () => {
    const a = sel;
    const splitData = a.splits?.map((s, i) => ({ 
      km: i + 1, dur: s[0], hr: s[1], cad: s[2], eg: s[3], el: s[4], paceStr: fmt(s[0]), paceMin: +(s[0] / 60).toFixed(2) 
    })) || [];
    const coord = getCoords(a.name);
    const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${coord.lng - 0.02}%2C${coord.lat - 0.015}%2C${coord.lng + 0.02}%2C${coord.lat + 0.015}&layer=mapnik&marker=${coord.lat}%2C${coord.lng}`;

    return (
      <div>
        <button onClick={() => setSel(null)} style={{ background: "none", border: "none", color: "#F0B428", fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", padding: "3px 0", marginBottom: 8 }}>← Tillbaka</button>
        <div style={{ background: "#14161C", borderRadius: 10, padding: 16, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 10 }}>
          <div style={{ ...M, fontSize: 9, color: CAT[a.type]?.c, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2 }}>{CAT[a.type]?.l} · {a.date}</div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: a.type === "race" ? "#F0B428" : "#F5F8FF", margin: "0 0 12px" }}>{a.name}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {[["Distans", `${a.km} km`], ["Tid", a.time], ["Tempo", `${a.pace}/km`], ["↑ Höjd", `${a.el}m`], ["♥ Snitt", a.hr > 0 ? `${a.hr}` : "-"], ["♥ Max", a.mhr > 0 ? `${a.mhr}` : "-"]].map(([l, v], i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "6px 8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: 8, ...M, color: "#787E8C", letterSpacing: .5 }}>{l}</div>
                <div style={{ fontSize: 14, fontWeight: 700, ...M, color: "#DCE1EB", marginTop: 1 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {splitData.length > 0 ? (() => {
          const maxEg = Math.max(...splitData.map(s => s.eg), 1);
          return (
            <div style={{ background: "#14161C", borderRadius: 10, padding: "12px 6px 6px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#DCE1EB", padding: "0 8px 6px" }}>Tempo, Puls & Höjdmeter per km</div>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={splitData} margin={{ top: 5, right: 45, left: -5, bottom: 5 }}>
                  <XAxis dataKey="km" tick={{ fontSize: 9, fill: "#787E8C" }} axisLine={{ stroke: "#2A2D35" }} tickLine={false} />
                  <YAxis yAxisId="pace" orientation="left" domain={['auto', 'auto']} tickFormatter={paceTick} tick={{ fontSize: 9, fill: "#5070DC" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="hr" orientation="right" domain={['auto', 'auto']} tick={{ fontSize: 9, fill: "#DC6444" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="elev" orientation="right" domain={[0, Math.ceil(maxEg * 1.3)]} tick={{ fontSize: 8, fill: "#40A878" }} axisLine={false} tickLine={false} dx={30} />
                  <Tooltip content={<SplitTooltip />} />
                  <Bar yAxisId="pace" dataKey="paceMin" fill="#5070DC" opacity={0.75} radius={[3, 3, 0, 0]} barSize={14} />
                  <Line yAxisId="hr" type="monotone" dataKey="hr" stroke="#DC6444" strokeWidth={2} dot={{ r: 3, fill: "#DC6444", stroke: "#0C0E12", strokeWidth: 1.5 }} />
                  <Line yAxisId="elev" type="monotone" dataKey="eg" stroke="#40A878" strokeWidth={1.5} dot={{ r: 2, fill: "#40A878", stroke: "#0C0E12", strokeWidth: 1 }} strokeDasharray="4 2" />
                </ComposedChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", padding: "4px 0" }}>
                <span style={{ fontSize: 9, color: "#5070DC" }}>█ Tempo (min/km)</span>
                <span style={{ fontSize: 9, color: "#DC6444" }}>━ Puls (bpm)</span>
                <span style={{ fontSize: 9, color: "#40A878" }}>╌ Höjdmeter (m)</span>
              </div>
            </div>);
        })() : (
          <div style={{ background: "#14161C", borderRadius: 10, padding: 20, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 10, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#787E8C" }}>Split-data laddas från backend vid deploy</div>
            <div style={{ fontSize: 10, color: "#5A5F69", marginTop: 4 }}>Mellannivå: tempo, puls, kadens, höjd per km</div>
          </div>
        )}

        <div style={{ background: "#14161C", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#DCE1EB", padding: "10px 12px 0" }}>Karta</div>
          <iframe src={mapUrl} style={{ width: "100%", height: 200, border: "none", borderRadius: "0 0 10px 10px", filter: "saturate(0.3) brightness(0.8)" }} title="map" />
          <div style={{ padding: "6px 12px 10px", fontSize: 9, color: "#5A5F69" }}>GPS-spår visas med full data vid deploy (mikronivå: koordinater var 5:e sek)</div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div style={{ background: "#0C0E12", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#F0B428", fontFamily: "sans-serif" }}>Laddar träningsdata...</div>;
  }

  return (
    <div style={{ fontFamily: "'DM Sans','Helvetica Neue',sans-serif", background: "#0C0E12", color: "#D2D7E1", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{ background: "linear-gradient(135deg,#141923,#1E140F)", padding: "20px 20px 12px", borderBottom: "1px solid rgba(255,200,60,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ ...M, fontSize: 10, color: "#F0B428", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>{daysLeft} dagar kvar</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 1px", color: "#F5F8FF" }}>Lidingöloppet 30K</h1>
            <div style={{ fontSize: 11, color: "#8C919B" }}>26 sep · Sub 2:00 · 550 hm</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ ...M, fontSize: 18, fontWeight: 700, color: "#F0B428" }}>{totalKm.toFixed(0)}</div>
            <div style={{ fontSize: 9, color: "#787E8C" }}>km 2026</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#101218", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSel(null); setLegend(null); }} style={{ flex: "0 0 auto", padding: "9px 8px", background: "none", border: "none", borderBottom: tab === t.id ? "2px solid #F0B428" : "2px solid transparent", color: tab === t.id ? "#F0B428" : "#646973", fontSize: 10, fontWeight: tab === t.id ? 600 : 400, fontFamily: "'DM Sans',sans-serif", cursor: "pointer", whiteSpace: "nowrap" }}>
            {t.i} {t.l}
          </button>
        ))}
      </div>

      <div style={{ padding: "12px 16px", paddingBottom: legend ? 160 : 12 }}>
        {/* ACTIVITIES LIST */}
        {tab === "activities" && !sel && (
          <div>
            <div style={{ display: "flex", gap: 3, marginBottom: 10, flexWrap: "wrap" }}>
              {[["all", "Alla", "#D2D7E1"], ...Object.entries(CAT).map(([k, v]) => [k, v.l, v.c])].map(([k, l, c]) => (
                <button key={k} onClick={() => { setFilter(k); setLegend(filter === k && legend === k ? null : k); }} style={{ padding: "4px 9px", borderRadius: 10, border: "none", fontSize: 10, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", background: filter === k ? c : "rgba(255,255,255,0.05)", color: filter === k ? "#0C0E12" : "#8C919B", fontWeight: filter === k ? 600 : 400 }}>{l}</button>
              ))}
            </div>
            {filtered.map(a => {
              const c = CAT[a.type] || CAT.easy;
              return (
                <button key={a.id} onClick={() => setSel(a)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px", marginBottom: 4, borderRadius: 7, border: "none", background: "#14161C", cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans',sans-serif" }}>
                  <div style={{ width: 3, height: 28, borderRadius: 2, background: c.c, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: a.type === "race" ? "#F0B428" : "#DCE1EB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>{a.name}</div>
                      <div style={{ ...M, fontSize: 10, color: "#A0A5B0" }}>{a.time}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 1, fontSize: 9, color: "#787E8C" }}>
                      <span>{a.date}</span><span style={M}>{a.km}km</span><span style={M}>{a.pace}/km</span>
                      {a.hr > 0 && <span>♥{a.hr}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
            {legend && legend !== "all" && CAT[legend] && (
              <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "14px 20px 22px", background: "linear-gradient(0deg,#14161C 80%,transparent)", borderTop: "1px solid rgba(255,255,255,0.1)", zIndex: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: CAT[legend].c }} />
                  <div style={{ fontSize: 12, fontWeight: 600, color: CAT[legend].c }}>{CAT[legend].l}</div>
                  <button onClick={() => setLegend(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#787E8C", cursor: "pointer", fontSize: 14 }}>✕</button>
                </div>
                <div style={{ fontSize: 11, color: "#A0A5B0", lineHeight: 1.5 }}>{CAT[legend].d}</div>
              </div>
            )}
          </div>
        )}

        {/* ACTIVITY DETAIL */}
        {tab === "activities" && sel && renderDetail()}

        {/* VOLUME */}
        {tab === "volume" && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#DCE1EB", marginBottom: 3 }}>Veckovolym (km)</div>
            <div style={{ fontSize: 10, color: "#787E8C", marginBottom: 10 }}>12 veckor · Streckad = 4v snitt</div>
            <div style={{ background: "#14161C", borderRadius: 10, padding: "14px 6px 6px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={wkData} margin={{ top: 5, right: 8, left: -20, bottom: 5 }}>
                  <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F0B428" stopOpacity={0.3} /><stop offset="95%" stopColor="#F0B428" stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="mon" tick={{ fontSize: 9, fill: "#787E8C" }} axisLine={{ stroke: "#2A2D35" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#787E8C" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#1A1C24", border: "1px solid #2A2D35", borderRadius: 6, fontSize: 11 }} formatter={(v, n) => [`${v} km`, n === "km" ? "Volym" : "4v snitt"]} />
                  <Area type="monotone" dataKey="km" stroke="#F0B428" strokeWidth={2} fill="url(#g1)" dot={{ r: 3, fill: "#F0B428", stroke: "#0C0E12", strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="avg" stroke="#DC6444" strokeWidth={2} strokeDasharray="5 3" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* AEROBIC EFFICIENCY */}
        {tab === "aero" && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#DCE1EB", marginBottom: 2 }}>Aerob effektivitet — lugna pass</div>
            <div style={{ fontSize: 10, color: "#787E8C", marginBottom: 10 }}>Snabbare tempo vid samma puls = bättre form</div>

            <div style={{ background: "#14161C", borderRadius: 10, padding: "12px 6px 6px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "#8C919B", padding: "0 8px 4px" }}>Tempo (x) vs Puls (y) — nyare pass i blått</div>
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="pace" type="number" domain={['auto', 'auto']} tickFormatter={paceTick} tick={{ fontSize: 9, fill: "#787E8C" }} axisLine={{ stroke: "#2A2D35" }} tickLine={false} name="Tempo" />
                  <YAxis dataKey="hr" type="number" domain={['auto', 'auto']} tick={{ fontSize: 9, fill: "#787E8C" }} axisLine={false} tickLine={false} name="Puls" unit=" bpm" />
                  <Tooltip content={<AeroTooltip />} />
                  <Scatter data={aeroRuns} fill="#5090F0">
                    {aeroRuns.map((d, i) => <Cell key={i} fill={d.color} r={5} stroke="#0C0E12" strokeWidth={1.5} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", padding: "4px 0", flexWrap: "wrap" }}>
                {[["#5090F0", "0–4 veckor"], ["#F0B428", "5–8 veckor"], ["#DC6444", "9–12 veckor"], ["#586070", ">12 veckor"]].map(([c, l]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 8, height: 8, borderRadius: 4, background: c }} /><span style={{ fontSize: 9, color: "#8C919B" }}>{l}</span></div>
                ))}
              </div>
            </div>

            <div style={{ background: "#14161C", borderRadius: 10, padding: "12px 6px 6px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "#8C919B", padding: "0 8px 4px" }}>Tempopuls (tempo × puls / 1000) — lägre = bättre</div>
              <ResponsiveContainer width="100%" height={140}>
                <ComposedChart data={aeroLine} margin={{ top: 5, right: 8, left: -15, bottom: 5 }}>
                  <XAxis dataKey="idx" tick={{ fontSize: 8, fill: "#787E8C" }} axisLine={{ stroke: "#2A2D35" }} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: "#787E8C" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#1A1C24", border: "1px solid #2A2D35", borderRadius: 6, fontSize: 11 }} formatter={(v, n) => [v, n === "tp" ? "Tempopuls" : "10-pass snitt"]} />
                  <Area type="monotone" dataKey="tp" stroke="#B480E0" strokeWidth={1.5} fill="rgba(180,128,224,0.1)" dot={{ r: 2, fill: "#B480E0", stroke: "#0C0E12", strokeWidth: 1 }} />
                  <Line type="monotone" dataKey="trendTp" stroke="#B480E0" strokeWidth={2} strokeDasharray="5 3" dot={false} opacity={0.6} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: "#14161C", borderRadius: 10, padding: "12px 6px 6px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "#8C919B", padding: "0 8px 4px" }}>Tempo-trend (min/km) — lägre = snabbare</div>
              <ResponsiveContainer width="100%" height={130}>
                <ComposedChart data={aeroLine} margin={{ top: 5, right: 8, left: -10, bottom: 5 }}>
                  <XAxis dataKey="idx" tick={{ fontSize: 8, fill: "#787E8C" }} axisLine={{ stroke: "#2A2D35" }} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} reversed tickFormatter={paceTick} tick={{ fontSize: 9, fill: "#787E8C" }} axisLine={false} tickLine={false} />
                  <Line type="monotone" dataKey="pace" stroke="#40A878" strokeWidth={1} dot={{ r: 2, fill: "#40A878", stroke: "#0C0E12", strokeWidth: 1 }} />
                  <Line type="monotone" dataKey="trendPace" stroke="#40A878" strokeWidth={2} strokeDasharray="5 3" dot={false} opacity={0.6} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: "#14161C", borderRadius: 10, padding: "12px 6px 6px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 10, color: "#8C919B", padding: "0 8px 4px" }}>Puls-trend (bpm) — lägre = bättre</div>
              <ResponsiveContainer width="100%" height={130}>
                <ComposedChart data={aeroLine} margin={{ top: 5, right: 8, left: -20, bottom: 5 }}>
                  <XAxis dataKey="idx" tick={{ fontSize: 8, fill: "#787E8C" }} axisLine={{ stroke: "#2A2D35" }} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: "#787E8C" }} axisLine={false} tickLine={false} />
                  <Line type="monotone" dataKey="hr" stroke="#DC6444" strokeWidth={1} dot={{ r: 2, fill: "#DC6444", stroke: "#0C0E12", strokeWidth: 1 }} />
                  <Line type="monotone" dataKey="trendHr" stroke="#DC6444" strokeWidth={2} strokeDasharray="5 3" dot={false} opacity={0.6} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "rgba(60,160,120,0.08)", border: "1px solid rgba(60,160,120,0.2)", fontSize: 10, color: "#78C8A0", lineHeight: 1.5 }}>
              <strong>Tolkning:</strong> I scatterplotten vill du se blåa prickar (nyare) längre till vänster (snabbare) och/eller lägre (lägre puls) jämfört med röda/gråa. Det visar aerob förbättring.
            </div>
          </div>
        )}

        {/* PLAN */}
        {tab === "plan" && (
          <div>
            <button onClick={() => setShowHist(!showHist)} style={{ width: "100%", padding: "10px 14px", marginBottom: 8, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "#14161C", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#A0A5B0", textAlign: "left" }}>Genomförda veckor</div>
                <div style={{ fontSize: 9, color: "#5A5F69", marginTop: 1, textAlign: "left" }}>{histWeeks.length} veckor med faktisk intensitetsfördelning</div>
              </div>
              <div style={{ fontSize: 14, color: "#787E8C", transform: showHist ? "rotate(180deg)" : "", transition: "transform 0.2s" }}>▾</div>
            </button>
            {showHist && (
              <div style={{ marginBottom: 12 }}>
                {histWeeks.map((w) => {
                  const isExp = expHist === w.wk;
                  return (
                    <div key={w.wk} style={{ marginBottom: 4, borderRadius: 6, background: "#14161C", border: "1px solid rgba(255,255,255,0.04)", overflow: "hidden" }}>
                      <button onClick={() => setExpHist(isExp ? null : w.wk)} style={{ width: "100%", padding: "7px 12px", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "left" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontSize: 10, color: "#8C919B" }}>{w.wk} <span style={{ color: "#5A5F69" }}>({w.mon})</span></div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ ...M, fontSize: 11, fontWeight: 600, color: "#A0A5B0" }}>{w.km} km</div>
                            <div style={{ fontSize: 10, color: "#5A5F69", transform: isExp ? "rotate(180deg)" : "", transition: "transform 0.2s" }}>▾</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", marginTop: 4, gap: 1 }}>
                          {Object.entries(w.pct).map(([k, v]) => (<div key={k} style={{ width: `${v}%`, background: iC[k] || CAT[k]?.c || "#586070", minWidth: v > 0 ? 2 : 0 }} />))}
                        </div>
                        <div style={{ display: "flex", gap: 5, marginTop: 2 }}>{Object.entries(w.pct).filter(([, v]) => v > 0).map(([k, v]) => (<span key={k} style={{ fontSize: 7, color: iC[k] || CAT[k]?.c || "#586070" }}>{CAT[k]?.l || k} {v}%</span>))}</div>
                      </button>
                      {isExp && (
                        <div style={{ padding: "0 12px 8px" }}>
                          {w.acts.sort((a, b) => a.date.localeCompare(b.date)).map(a => {
                            const c = CAT[a.type] || CAT.easy;
                            const dayName = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"][new Date(a.date + "T12:00:00").getDay()];
                            return (
                              <div key={a.id} style={{ display: "flex", gap: 6, alignItems: "center", padding: "5px 8px", marginTop: 3, borderRadius: 5, background: "rgba(255,255,255,0.02)" }}>
                                <div style={{ width: 3, height: 20, borderRadius: 2, background: c.c, flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <div style={{ fontSize: 10, fontWeight: 500, color: "#B4B9C3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                                      <span style={{ color: "#5A5F69" }}>{dayName} </span>{a.name}
                                    </div>
                                    <div style={{ ...M, fontSize: 9, color: "#787E8C" }}>{a.time}</div>
                                  </div>
                                  <div style={{ display: "flex", gap: 6, marginTop: 1, fontSize: 8, color: "#5A5F69" }}>
                                    <span style={M}>{a.km}km</span>
                                    <span style={M}>{a.pace}/km</span>
                                    {a.hr > 0 && <span>♥{a.hr}</span>}
                                    {a.el > 0 && <span>↑{a.el}m</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 600, color: "#F0B428", marginBottom: 6 }}>Kommande träningsplan</div>
            {PLAN.map((p, i) => {
              const isE = expW === i, isR = p.f.includes("RACE"); return (
                <div key={i} style={{ marginBottom: 6, borderRadius: 8, border: isR ? "1px solid rgba(240,180,40,0.25)" : "1px solid rgba(255,255,255,0.06)", background: "#14161C", overflow: "hidden" }}>
                  <button onClick={() => setExpW(isE ? -1 : i)} style={{ width: "100%", padding: "10px 12px", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "left" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div><div style={{ fontSize: 12, fontWeight: 600, color: isR ? "#FFD246" : "#DCE1EB" }}>{p.w} <span style={{ fontWeight: 400, color: "#787E8C", fontSize: 10 }}>({p.d})</span></div><div style={{ fontSize: 9, color: "#787E8C", marginTop: 1 }}>{p.f}</div></div>
                      <div style={{ ...M, fontSize: 13, fontWeight: 600, color: "#B4B9C3" }}>{p.km}km</div>
                    </div>
                    <div style={{ display: "flex", height: 5, borderRadius: 3, overflow: "hidden", marginTop: 6, gap: 1 }}>{Object.entries(p.pct).map(([k, v]) => (<div key={k} style={{ width: `${v}%`, background: iC[k] || "#586070", minWidth: v > 0 ? 2 : 0 }} />))}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 3 }}>{Object.entries(p.pct).map(([k, v]) => (<span key={k} style={{ fontSize: 8, color: iC[k] || "#586070" }}>{CAT[k]?.l || k} {v}%</span>))}</div>
                  </button>
                  {isE && (<div style={{ padding: "0 12px 10px", fontSize: 11, color: "#A0A5B0", lineHeight: 1.7 }}>{p.days.split("·").map((d, j) => <div key={j}>{d.trim()}</div>)}</div>)}
                </div>);
            })}
          </div>
        )}

        {/* RACE */}
        {tab === "race" && (
          <div>
            <div style={{ background: "#14161C", borderRadius: 10, padding: 14, marginBottom: 10, border: "1px solid rgba(240,180,40,0.2)" }}>
              <div style={{ ...M, fontSize: 9, color: "#F0B428", letterSpacing: 1.5, textTransform: "uppercase" }}>Lördag 26 sep 2026</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#F5F8FF", marginTop: 1 }}>TCS Lidingöloppet 30K</div>
              <div style={{ fontSize: 10, color: "#787E8C", marginBottom: 10 }}>30 km · ~550 hm · Terräng</div>
              {[{ l: "STRETCH", t: "Sub 2:00", p: "4:00/km", d: "HM-tempo i 30km terräng. Perfekt dag.", a: true }, { l: "A-MÅL", t: "2:02–2:05", p: "4:05–4:10/km", d: "Flat 30km ~2:02 + terräng." }, { l: "B-MÅL", t: "Sub 2:10", p: "4:20/km", d: "Solid. Kraft kvar sista milen." }].map((g, i) => (
                <div key={i} style={{ padding: 10, borderRadius: 6, marginBottom: 5, background: g.a ? "linear-gradient(135deg,rgba(240,180,40,0.12),rgba(240,180,40,0.04))" : "rgba(255,255,255,0.03)", border: g.a ? "1px solid rgba(240,180,40,0.2)" : "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ ...M, fontSize: 8, color: g.a ? "#F0B428" : "#787E8C", letterSpacing: 1 }}>{g.l}</span><span style={{ ...M, fontSize: 8, color: "#8C919B" }}>{g.p}</span></div>
                  <div style={{ ...M, fontSize: 18, fontWeight: 700, color: g.a ? "#FFD246" : "#B4B9C3", marginTop: 1 }}>{g.t}</div>
                  <div style={{ fontSize: 10, color: "#8C919B", marginTop: 2 }}>{g.d}</div>
                </div>))}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#DCE1EB", marginBottom: 6 }}>Lopphistorik</div>
            {races.map(r => (<div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", marginBottom: 4, borderRadius: 6, background: "#14161C", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div><div style={{ fontSize: 11, fontWeight: 600, color: "#F0B428" }}>{r.name}</div><div style={{ fontSize: 9, color: "#787E8C", marginTop: 1 }}>{r.date} · {r.km}km</div></div>
              <div style={{ textAlign: "right" }}><div style={{ ...M, fontSize: 14, fontWeight: 700, color: "#DCE1EB" }}>{r.time}</div><div style={{ ...M, fontSize: 9, color: "#8C919B" }}>{r.pace}/km</div></div>
            </div>))}
          </div>
        )}

        {/* STRATEGY */}
        {tab === "strategy" && (
          <div>
            <div style={{ background: "#14161C", borderRadius: 8, padding: 12, border: "1px solid rgba(240,180,40,0.2)", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#FFD246" }}>Lidingöloppet — Tempostrategi</div>
              <div style={{ fontSize: 10, color: "#8C919B" }}>Negativ split · hushålla sista milen</div>
            </div>
            <div style={{ background: "#14161C", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "48px 56px 52px 1fr", padding: "7px 10px", fontSize: 8, ...M, color: "#5A5F69", borderBottom: "1px solid rgba(255,255,255,0.06)", textTransform: "uppercase", letterSpacing: 1 }}><div>KM</div><div>PACE</div><div>TOT</div><div>KOMMENTAR</div></div>
              {PACE.map((s, i) => {
                const h = i >= 5; return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "48px 56px 52px 1fr", padding: "8px 10px", borderBottom: i < PACE.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: h ? "rgba(220,100,60,0.08)" : "transparent", fontSize: 10 }}>
                    <div style={{ ...M, fontWeight: 600, color: h ? "#F08C64" : "#B4B9C3" }}>{s.km}</div><div style={{ ...M, color: h ? "#FFA078" : "#A0A5B0" }}>{s.p}</div><div style={{ ...M, color: "#787E8C", fontSize: 9 }}>{s.t}</div><div style={{ color: "#8C919B", lineHeight: 1.3, fontSize: 9 }}>{s.n}</div>
                  </div>);
              })}
            </div>
          </div>
        )}

        {/* COACH */}
        {tab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 160px)" }}>
            <div style={{ flex: 1, overflowY: "auto", paddingBottom: 6 }}>
              {msgs.map((m, i) => (<div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 6 }}>
                <div style={{ maxWidth: "85%", padding: "9px 12px", borderRadius: 10, fontSize: 11, lineHeight: 1.5, background: m.role === "user" ? "rgba(240,180,40,0.15)" : "#14161C", color: m.role === "user" ? "#F0D070" : "#C8CDD7", border: m.role === "user" ? "1px solid rgba(240,180,40,0.2)" : "1px solid rgba(255,255,255,0.06)", whiteSpace: "pre-wrap" }}>{m.content}</div>
              </div>))}
              {chatL && <div style={{ padding: "9px 12px", borderRadius: 10, background: "#14161C", border: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: "#787E8C", display: "inline-block" }}>Tänker...</div>}
              <div ref={chatE} />
            </div>
            <div style={{ display: "flex", gap: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <input value={chatIn} onChange={e => setChatIn(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendChat(); } }} placeholder="Fråga om träning..." style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "#14161C", color: "#D2D7E1", fontSize: 11, fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
              <button onClick={sendChat} disabled={chatL} style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: "#F0B428", color: "#0C0E12", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", opacity: chatL ? 0.5 : 1 }}>Skicka</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}