import { useState, useEffect, useMemo, useRef } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, Scatter, ScatterChart, CartesianGrid, Cell } from "recharts";
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// ==========================================
// 1. KONSTANTER OCH HJÄLPFUNKTIONER
// ==========================================
const NOW = new Date();
const M = { fontFamily: "'DM Mono',monospace" };
const iC = { easy: "#40A878", threshold: "#C85A9C", interval: "#DC6444", long: "#5070DC", race: "#F0B428" };

const CAT = {
  race: { l: "Tävling", c: "#F0B428", d: "Officiellt lopp. Snittpuls >170." },
  test: { l: "Test", c: "#E08040", d: "Tidstest (5K/3K PB). Maximal ansträngning." },
  interval: { l: "Intervall", c: "#DC6444", d: "Korta repetitioner (400m–2km) med vila. Bygger VO₂max." },
  threshold: { l: "Tröskel", c: "#C85A9C", d: "Längre intervaller (6–10 min) nära tröskeln. Bygger uthållighetsfart." },
  long: { l: "Långpass", c: "#5070DC", d: "Pass >15 km. Bygger aerob bas." },
  easy: { l: "Lugn", c: "#40A878", d: "Lätt löpning. Snittpuls <148. Återhämtning." },
  moderate: { l: "Medel", c: "#60B8A0", d: "Medelhög intensitet." },
};

const PACE = [
  { km: "Start–5", p: "4:10–4:15", t: "~21:00", n: "LUGN start. Puls <165." },
  { km: "5–10", p: "4:05–4:10", t: "~41:30", n: "Hitta rytmen. Drick vid ~5.5km." },
  { km: "10–15", p: "4:00–4:05", t: "~1:01:30", n: "Halvvägs. Gel vid km 12." },
  { km: "15–20", p: "4:00–4:05", t: "~1:21:30", n: "Grönsta. Drick!" },
  { km: "20–25", p: "4:00", t: "~1:41:30", n: "TUFFAST. Abborrbacken ~km 25." },
  { km: "25–28", p: "3:55", t: "~1:53:15", n: "🔥 Öka! Utför efter Abborrbacken." },
  { km: "28–30", p: "3:50", t: "~2:00:55", n: "🚀 ALLT UT!" },
];

const PLAN = [
  { 
    w: "2026-W26", 
    f: "Basvecka", 
    km: 45, 
    days: "Mån: Vila\nOns: 10km distans\nFre: 5x1000m tröskel\nSön: 20km Långpass" 
  },
  { 
    w: "2026-W27", 
    f: "Volym", 
    km: 55, 
    days: "Mån: Vila\nOns: 12km distans\nFre: 3x3km tröskel\nSön: 25km Långpass" 
  }
];

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
  const [msgs, setMsgs] = useState([{ role: "assistant", content: "Hej! Jag är din AI-coach. Jag har full koll på din historik från Garmin. Du kan be mig ändra i ditt framtida schema (t.ex. vid skada eller extrem trötthet) så justerar jag det direkt!" }]);
  const [chatIn, setChatIn] = useState("");
  const [chatL, setChatL] = useState(false);
  const chatE = useRef(null);

  // States för backend-data
  const [dbActivities, setDbActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // States för On-Demand detaljer
  const [activeSplits, setActiveSplits] = useState([]);
  const [activeTimeSeries, setActiveTimeSeries] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [futurePlan, setFuturePlan] = useState([]);

  // Hämta grunddata från Render när appen startar
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

    fetch("https://training-backend-4xfk.onrender.com/api/activities")
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) setFuturePlan(data);
      })
      .catch(() => {
        console.log("Använder förbyggd träningsplan tills C-stadiet är deployat.");
      });
  }, []);

  // HÄMTA DETALJER (SPLITS + GPS-PUNKTER) ENBART NÄR MAN KLICKAR PÅ ETT PASS
  const handleSelectActivity = async (activity) => {
    setSel(activity);
    setLoadingDetail(true);
    setActiveSplits([]);
    setActiveTimeSeries([]);

    try {
      const detailRes = await fetch(`https://training-backend-4xfk.onrender.com/api/activities/${activity.gid}`);
      const detailData = await detailRes.json();
      setActiveSplits(detailData.splits || []);

      const tsRes = await fetch(`https://training-backend-4xfk.onrender.com/api/activities/${activity.gid}/timeseries`);
      const tsData = await tsRes.json();
      setActiveTimeSeries(tsData || []);
    } catch (err) {
      console.error("Kunde inte hämta detaljdata för passet:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

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
        splits: null
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

  // Ritar ut den aktiva aktiviteten
  const renderDetail = () => {
    const a = sel;
    
    // Mappa de unika splitsen från backend
    const splitData = activeSplits?.map((s) => ({ 
      km: s.lap_number, 
      dur: s.duration_s, 
      hr: s.avg_hr, 
      cad: s.avg_cadence, 
      eg: s.elev_gain || 0, 
      el: s.elev_loss || 0, 
      paceStr: fmt(s.duration_s), 
      paceMin: +(s.duration_s / 60).toFixed(2) 
    })) || [];

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

        {loadingDetail ? (
          <div style={{ background: "#14161C", borderRadius: 10, padding: 40, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 10, textAlign: "center", color: "#F0B428", fontSize: 12 }}>
            Hämtar varvtider och GPS-spår live från Supabase...
          </div>
        ) : (
          <>
            {splitData.length > 0 ? (() => {
              const maxEg = Math.max(...splitData.map(s => s.eg), 1);
              return (
                <div style={{ background: "#14161C", borderRadius: 10, padding: "12px 6px 6px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#DCE1EB", padding: "0 8px 6px" }}>Mellantider live från Supabase</div>
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
                <div style={{ fontSize: 12, color: "#787E8C" }}>Ingen split-data tillgänglig för detta pass.</div>
              </div>
            )}

            {/* Karta laddad från GPS-punkternas sanna koordinater */}
            <div style={{ background: "#14161C", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#DCE1EB", padding: "10px 12px 10px" }}>
                GPS-spår ({activeTimeSeries.length} punkter)
              </div>
              
              {activeTimeSeries.length > 0 ? (() => {
                // Filtrera fram giltiga koordinater och skapa en array format [lat, lng]
                const positions = activeTimeSeries
                  .filter(p => p.latitude && p.longitude)
                  .map(p => [p.latitude, p.longitude]);

                if (positions.length === 0) return <div style={{ padding: 20, color: "#787E8C", fontSize: 11 }}>Ingen GPS-data tillgänglig för passet.</div>;

                return (
                  <MapContainer 
                    bounds={positions} 
                    scrollWheelZoom={false}
                    style={{ width: "100%", height: 250, background: "#0C0E12", zIndex: 0 }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />
                    <Polyline positions={positions} color="#F0B428" weight={3} opacity={0.8} />
                  </MapContainer>
                );
              })() : (
                <div style={{ height: 250, display: "flex", alignItems: "center", justifyContent: "center", color: "#787E8C", fontSize: 11 }}>
                  Laddar GPS-spår...
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div style={{ background: "#0C0E12", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#F0B428", fontFamily: "sans-serif" }}>Laddar träningsdata...</div>;
  }

  // Fallback-planer om databasen är tom
  const activePlanList = futurePlan.length > 0 ? futurePlan : PLAN;

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
                <button key={a.id} onClick={() => handleSelectActivity(a)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px", marginBottom: 4, borderRadius: 7, border: "none", background: "#14161C", cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans',sans-serif" }}>
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
            </button>

            <div style={{ fontSize: 11, fontWeight: 600, color: "#F0B428", marginBottom: 6 }}>Kommande träningsplan</div>
            {activePlanList.map((p, i) => {
              const isE = expW === i, isR = p.f?.includes("RACE") || p.title?.includes("LIDINGÖ"); return (
                <div key={i} style={{ marginBottom: 6, borderRadius: 8, border: isR ? "1px solid rgba(240,180,40,0.25)" : "1px solid rgba(255,255,255,0.06)", background: "#14161C", overflow: "hidden" }}>
                  <button onClick={() => setExpW(isE ? -1 : i)} style={{ width: "100%", padding: "10px 12px", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "left" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: isR ? "#FFD246" : "#DCE1EB" }}>{p.w || p.date}</div>
                        <div style={{ fontSize: 9, color: "#787E8C", marginTop: 1 }}>{p.f || p.title}</div>
                      </div>
                      <div style={{ ...M, fontSize: 13, fontWeight: 600, color: "#B4B9C3" }}>{p.km || Math.round((p.planned_distance_m || 0)/1000)} km</div>
                    </div>
                  </button>
                  {isE && (<div style={{ padding: "0 12px 10px", fontSize: 11, color: "#A0A5B0", lineHeight: 1.7 }}>{p.days || p.description}</div>)}
                </div>);
            })}
          </div>
        )}

        {/* ... (Här rullar dina orörda flikar vidare: RACE, STRATEGY) ... */}

        {/* COACH / CHATT */}
        {tab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 160px)" }}>
            <div style={{ flex: 1, overflowY: "auto", paddingBottom: 6 }}>
              {msgs.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 6 }}>
                  <div style={{ maxWidth: "85%", padding: "9px 12px", borderRadius: 10, fontSize: 11, lineHeight: 1.5, background: m.role === "user" ? "rgba(240,180,40,0.15)" : "#14161C", color: m.role === "user" ? "#F0D070" : "#C8CDD7", border: m.role === "user" ? "1px solid rgba(240,180,40,0.2)" : "1px solid rgba(255,255,255,0.06)", whiteSpace: "pre-wrap" }}>{m.content}</div>
                </div>
              ))}
              {chatL && <div style={{ padding: "9px 12px", borderRadius: 10, background: "#14161C", border: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: "#787E8C", display: "inline-block" }}>Planerar om framtida träningsblock...</div>}
              <div ref={chatE} />
            </div>
            <div style={{ display: "flex", gap: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <input value={chatIn} onChange={e => setChatIn(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendChat(); } }} placeholder="Skriv till coachen (t.ex: 'Benhinnekänning, justera schemat')..." style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "#14161C", color: "#D2D7E1", fontSize: 11, fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
              <button onClick={sendChat} disabled={chatL} style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: "#F0B428", color: "#0C0E12", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", opacity: chatL ? 0.5 : 1 }}>Skicka</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}