import { useState, useEffect, useMemo, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, ComposedChart, Scatter, ScatterChart, CartesianGrid } from "recharts";

// [date, name, dist_m, dur_s, avg_hr, max_hr, elev, id]
const RAW = [
["2026-06-17","Stockholm Löpning",10008,3446,135,149,52,"a1"],
["2026-06-16","3x6min 1min sv",9550,2923,150,177,79,"a2"],
["2026-06-15","Stockholm Löpning",10138,3392,143,155,74,"a3"],
["2026-06-13","Toughest Lida",8406,5927,150,187,368,"a4"],
["2026-06-09","Stockholm Löpning",11337,4113,137,156,185,"a5"],
["2026-06-07","Stockholm Löpning",16116,5408,139,152,119,"a7"],
["2026-06-06","Stockholm Löpning",8279,2737,139,159,116,"a8"],
["2026-06-02","Stockholm Löpning",7709,2696,145,184,98,"a9"],
["2026-06-01","Stockholm Löpning",10376,3214,140,155,78,"a10"],
["2026-05-31","Stockholm Löpning",10138,3043,147,166,78,"a11"],
["2026-05-23","Göteborgsvarvet 2026",21100,5130,172,186,178,"a12"],
["2026-05-20","Lugnt + 4x400m",9000,2866,144,176,70,"a14"],
["2026-05-17","12x1k @4:00 90s sv",15000,4953,150,173,0,"a15"],
["2026-05-16","Stockholm Löpning",10570,3476,140,154,83,"a16"],
["2026-05-14","Vamos Löpning",21393,6899,147,182,351,"a17"],
["2026-05-06","Stockholm Löpning",20438,5797,156,181,178,"a18"],
["2026-04-28","Stockholm Löpning",10280,3137,137,152,89,"a19"],
["2026-04-26","Bålsta Stadslopp 10k",10063,2259,172,184,104,"a20"],
["2026-04-22","Stockholm Löpning",6736,2268,139,170,52,"a22"],
["2026-04-21","Stockholm Löpning",9209,2860,142,157,64,"a23"],
["2026-04-19","3k PB try",3010,665,168,181,0,"a24"],
["2026-04-19","5k PB try",5010,1125,168,184,0,"a25"],
["2026-04-18","Stockholm Löpning",10073,2977,150,165,79,"a27"],
["2026-04-15","Stockholm Löpning",10203,3426,139,152,111,"a28"],
["2026-04-14","10x1k @3:50 1min sv",12500,3710,158,182,0,"a29"],
["2026-04-08","4x10min 2min sv",11265,3409,154,186,99,"a30"],
["2026-04-06","Stockholm Löpning",15086,4811,140,153,179,"a31"],
["2026-04-05","Långlöp 17k lugnt 5k snabbt",22012,7366,144,173,276,"a32"],
["2026-04-03","8x1k @3:50 60s sv",10500,3034,156,178,0,"a33"],
["2026-04-01","Stockholm Löpning",10121,3327,140,154,69,"a34"],
["2026-03-31","5x2k @4:05 2,5min sv",12692,3901,154,179,103,"a35"],
["2026-03-29","Göteborg Löpning",5259,1838,133,153,68,"a36"],
["2026-03-28","Göteborg Löpning",10390,3726,141,158,171,"a37"],
["2026-03-26","20x400m @3:30 50s sv",11000,4025,155,184,0,"a38"],
["2026-03-21","Stockholm Löpning",10245,3221,143,156,80,"a39"],
["2026-03-20","8x6min @4:20 90s sv",12100,4125,151,170,0,"a40"],
["2026-03-15","Linköping Löpning",18070,5700,146,167,159,"a41"],
["2026-03-14","Linköping Löpning",10348,3356,144,160,77,"a42"],
["2026-03-12","Stockholm Löpning",14370,4396,153,184,143,"a43"],
["2026-03-07","Stockholm Löpning",7100,2444,131,148,59,"a44"],
["2026-03-06","Stockholm Löpning",10148,3547,137,150,83,"a45"],
["2026-03-04","20x400m @3:30 3x1min @3:00 50s sv",10997,3744,155,185,0,"a46"],
["2026-02-28","Stockholm Löpning",14160,4888,135,160,121,"a47"],
["2026-02-27","6x8min @4:20 2min sv",13080,4336,148,169,0,"a48"],
["2026-02-25","Löpband",10600,3605,133,144,0,"a49"],
["2026-02-22","Stockholm Löpning",18325,6589,135,153,124,"a50"],
["2026-02-21","8x1k @3:50 60s sv",9500,3066,157,181,0,"a51"],
["2026-02-18","8x6min @4:20 + 10x200m @3:30",13580,4902,155,178,0,"a52"],
["2026-02-15","Löpband",10150,3600,135,152,0,"a54"],
["2026-02-07","Stockholm Löpning",10343,3392,136,151,79,"a55"],
["2026-02-05","20x400m 5@3:45 15@3:30 50s sv",10500,3801,148,177,0,"a56"],
["2026-02-03","Löpband",13100,4431,152,230,0,"a57"],
["2026-01-31","Stockholm Löpning",14672,5100,133,161,99,"a58"],
["2026-01-30","10x1k @3:55 90s sv",12000,4024,153,178,0,"a59"],
["2026-01-27","Löpband",9620,3301,139,148,0,"a60"],
["2026-01-25","8x6min @4:20 90s sv",12500,4064,152,173,0,"a61"],
["2026-01-24","Löpband",10500,3602,136,148,0,"a62"],
["2026-01-20","20x400m @3:50 45s sv",10500,3715,154,180,0,"a63"],
["2026-01-18","Stockholm Löpning",9961,3401,154,175,89,"a64"],
["2026-01-17","8x6min @4:20 90s sv",13500,3934,154,174,0,"a65"],
["2026-01-07","Löpband",10000,3524,143,151,0,"a66"],
["2026-01-05","8x6min @4:30/@4:20 90s jv",13800,4121,144,164,0,"a67"],
["2026-01-03","Puerto de la Cruz Löpning",11618,4113,138,163,191,"a68"],
["2026-01-01","Löpband",11000,3310,152,175,0,"a69"],
["2025-12-30","Puerto de la Cruz Löpning",8678,3149,137,160,142,"a70"],
["2025-12-22","Kristianstad Löpning",15671,4979,141,172,92,"a71"],
["2025-12-20","11x400m @3:25-3:10 1min sv",8210,2844,146,185,19,"a72"],
];

const CATEGORIES={
  race:{label:"Tävling",color:"#F0B428",desc:"Officiellt lopp/tävling. Klassas via loppnamn (Stadslopp, Göteborgsvarvet, Toughest etc). Maximal ansträngning, snittpuls >170."},
  test:{label:"Test",color:"#E08040",desc:"Tidstest på bestämd distans (5K/3K PB try). Maximal ansträngning för att mäta form. Snittpuls >165."},
  interval:{label:"Intervall",color:"#DC6444",desc:"Korta snabba repetitioner (400m–2km) med vila: '10x1k', '20x400m'. Puls 148–160, maxpuls >175. Bygger VO₂max och fart."},
  threshold:{label:"Tröskel",color:"#C85A9C",desc:"Längre intervaller (6–10 min) nära mjölksyratröskeln (~4:10–4:25/km): '8x6min', '4x10min'. Puls 148–165. Bygger uthållighetsfart."},
  long:{label:"Långpass",color:"#5070DC",desc:"Pass >15 km i lugnt tempo, ev. progressiv avslutning. Snittpuls 135–150. Bygger aerob bas och uthållighet."},
  easy:{label:"Lugn",color:"#40A878",desc:"Lätt löpning ~5:00–6:00/km. Snittpuls <148, maxpuls <170. Återhämtning och aerob basträning. Majoriteten av löpningen."},
  moderate:{label:"Medel",color:"#60B8A0",desc:"Medelhög intensitet utan strukturerade intervaller. Tempo snabbare än lugnt. Snittpuls 145–158."},
};

function classify(n,d,s,hr,mhr){
  const l=(n||"").toLowerCase();
  if(d===0) return "strength";
  if(["stadslopp","göteborgsvarvet","hässelby","toughest","djurgård"].some(k=>l.includes(k))) return "race";
  if(l.includes("pb try")) return "test";
  if(/\d+x\d+[mk\s]|\d+x\d{3}/.test(l)) return "interval";
  if(/\d+x\d+min/.test(l)||l.includes("tröskel")||l.includes("tempo")) return "threshold";
  if(l.includes("långlöp")||l.includes("lång")||(d>17000&&hr&&hr<152)) return "long";
  if(l.includes("uppv")) return "easy";
  if(hr&&hr<148&&mhr&&mhr<170) return "easy";
  return "moderate";
}
function fmt(s){const m=Math.floor(s/60),ss=Math.floor(s%60);return`${m}:${ss<10?'0':''}${ss}`;}
function fmtP(d,s){if(!d)return"--";const p=s/(d/1000);const m=Math.floor(p/60),ss=Math.floor(p%60);return`${m}:${ss<10?'0':''}${ss}`;}
function isoW(ds){const d=new Date(ds+"T12:00:00");const t=new Date(d);t.setDate(d.getDate()-((d.getDay()+6)%7)+3);const y=new Date(t.getFullYear(),0,4);const w=1+Math.round(((t-y)/864e5-(y.getDay()+6)%7+3)/7);return`${t.getFullYear()}-W${w<10?'0':''}${w}`;}
function wkMon(ds){const d=new Date(ds+"T12:00:00");d.setDate(d.getDate()-((d.getDay()+6)%7));return d.toISOString().slice(5,10);}

const PLAN=[
  {w:"V26",d:"22–28 jun",f:"Bas + terrängintro",km:52,pct:{easy:55,threshold:15,interval:15,long:15},days:"Mån: Lugn 8km · Tis: 6×1km@3:50/90s · Ons: Styrka · Tor: Lugn 8km terräng · Fre: Vila · Lör: Backpass 8×90s+10km · Sön: Långpass 20km"},
  {w:"V27–28",d:"jun/jul",f:"Volymbygge + backar",km:58,pct:{easy:50,threshold:20,interval:10,long:20},days:"Mån: Lugn 9km · Tis: 3×10min@4:10/2min · Ons: Styrka · Tor: Lugn 10km terräng · Fre: Vila · Lör: 5×4min backintervall · Sön: Långpass 22–24km kuperat"},
  {w:"V29–32",d:"jul/aug",f:"Lidingö-specifik",km:62,pct:{easy:45,threshold:20,interval:15,long:20},days:"Mån: Lugn 9km · Tis: 4×8min@4:10/2min · Ons: Styrka lätt · Tor: Lugn 10km stigar · Fre: Vila · Lör: Lidingöbanan! · Sön: Progressivt 25–28km"},
  {w:"V33–36",d:"aug/sep",f:"Toppform",km:60,pct:{easy:45,threshold:25,interval:15,long:15},days:"Mån: Lugn 8km · Tis: 6×2km@3:55/2min · Ons: Lugn 6km+stegringar · Tor: 2×20min@4:15 · Fre: Vila · Lör: Lidingöbanan sista milen · Sön: Sista långa 28–30km"},
  {w:"V37–38",d:"sep",f:"Taper",km:35,pct:{easy:65,threshold:10,interval:15,long:10},days:"Mån: Lugn 7km · Tis: 5×1km@3:50/90s · Ons: Vila · Tor: Lugn 5km+stegringar · Fre: Vila · Lör: Shakeout 3km · Sön: Vila"},
  {w:"V39",d:"21–26 sep",f:"RACE WEEK",km:25,pct:{easy:60,interval:10,race:30},days:"Mån: Shakeout 4km · Tis: 3×800m@3:45 · Ons: Vila · Tor: Shakeout 3km · Fre: Vila · Lör: 🏁 LIDINGÖLOPPET 30K"},
];

const PACE=[
  {km:"Start–5",p:"4:10–4:15",t:"~21:00",n:"LUGN start. Spara allt. Puls <165."},
  {km:"5–10",p:"4:05–4:10",t:"~41:30",n:"Hitta rytmen. Drick vid ~5.5km."},
  {km:"10–15",p:"4:00–4:05",t:"~1:01:30",n:"Halvvägs. Gel vid km 12."},
  {km:"15–20",p:"4:00–4:05",t:"~1:21:30",n:"Grönsta. Drick! Mentalt avgörande."},
  {km:"20–25",p:"4:00",t:"~1:41:30",n:"TUFFASTE MILEN. Abborrbacken ~km 25."},
  {km:"25–28",p:"3:55",t:"~1:53:15",n:"🔥 Öka! Utför efter Abborrbacken."},
  {km:"28–30",p:"3:50",t:"~2:00:55",n:"🚀 ALLT UT! Sprint mot Grönsta Gärde."},
];

const iC={easy:"#40A878",threshold:"#C85A9C",interval:"#DC6444",long:"#5070DC",race:"#F0B428"};
const M={fontFamily:"'DM Mono',monospace"};

export default function App(){
  const [tab,setTab]=useState("activities");
  const [sel,setSel]=useState(null);
  const [filter,setFilter]=useState("all");
  const [legend,setLegend]=useState(null);
  const [expW,setExpW]=useState(-1);
  const [msgs,setMsgs]=useState([{role:"assistant",content:"Hej! Jag har tillgång till alla dina 66 aktiviteter (dec 2025–jun 2026) med komplett data — splits, puls, kadens, höjdmeter. Fråga mig om specifika pass, jämförelser, formkurva, eller be mig justera planen."}]);
  const [chatIn,setChatIn]=useState("");
  const [chatL,setChatL]=useState(false);
  const chatE=useRef(null);

  const acts=useMemo(()=>RAW.map(r=>{
    const[date,name,dm,ds,hr,mhr,el,id]=r;
    const type=classify(name,dm,ds,hr,mhr);
    const spd=dm/ds; // m/s
    return{id,date,name,dm,ds,hr,mhr,el:el||0,type,
      km:+(dm/1000).toFixed(1),pace:fmtP(dm,ds),time:fmt(ds),spd,
      eff:hr>0&&spd>0?+((spd/hr)*1000).toFixed(2):null};
  }),[]);

  const filtered=filter==="all"?acts:acts.filter(a=>a.type===filter);

  // Veckovolym
  const wkData=useMemo(()=>{
    const now=new Date("2026-06-19");const wks={};
    acts.forEach(a=>{
      const d=new Date(a.date+"T12:00:00");
      if((now-d)/864e5>12*7||a.type==="strength") return;
      const w=isoW(a.date);
      if(!wks[w]) wks[w]={wk:w,km:0,mon:wkMon(a.date)};
      wks[w].km+=a.km;
    });
    const s=Object.values(wks).sort((a,b)=>a.wk.localeCompare(b.wk));
    return s.map((w,i)=>{
      const sl=s.slice(Math.max(0,i-3),i+1);
      w.avg=+(sl.reduce((s,x)=>s+x.km,0)/sl.length).toFixed(1);
      w.km=+w.km.toFixed(1); return w;
    });
  },[acts]);

  // Aerob effektivitet — lugna pass >5km
  const aeroData=useMemo(()=>{
    const easy=acts.filter(a=>a.type==="easy"&&a.km>=5&&a.hr>0&&a.spd>0)
      .sort((a,b)=>a.date.localeCompare(b.date));
    return easy.map((a,i)=>{
      const paceS=a.ds/(a.dm/1000); // sek/km
      const paceMK=+(paceS/60).toFixed(2); // min/km som decimaltal
      // Rullande 10-pass snitt
      const slice=easy.slice(Math.max(0,i-9),i+1);
      const avgPace=+(slice.reduce((s,x)=>s+(x.ds/(x.dm/1000)),0)/slice.length/60).toFixed(2);
      const avgHr=+(slice.reduce((s,x)=>s+x.hr,0)/slice.length).toFixed(0);
      const avgEff=+(slice.reduce((s,x)=>s+(x.eff||0),0)/slice.length).toFixed(2);
      return{date:a.date.slice(5),fullDate:a.date,name:a.name,km:a.km,
        pace:paceMK,hr:a.hr,eff:a.eff,
        trendPace:avgPace,trendHr:+avgHr,trendEff:+avgEff};
    });
  },[acts]);

  // Coach
  const sendChat=async()=>{
    if(!chatIn.trim()||chatL) return;
    const userMsg=chatIn.trim(); setChatIn(""); setMsgs(p=>[...p,{role:"user",content:userMsg}]); setChatL(true);
    try{
      const wkMap={};
      acts.forEach(a=>{const w=isoW(a.date);if(!wkMap[w])wkMap[w]={km:0,n:0,acts:[]};wkMap[w].km+=a.km;wkMap[w].n++;
        wkMap[w].acts.push(`${a.date} ${a.name} ${a.km}km ${a.time} ${a.pace}/km HR:${a.hr}/${a.mhr} elev:${a.el}m [${a.type}]${a.eff?` eff:${a.eff}`:''}`);});
      const ctx=Object.entries(wkMap).sort(([a],[b])=>a.localeCompare(b)).map(([w,d])=>`${w} (${d.km.toFixed(1)}km, ${d.n} pass):\n${d.acts.join("\n")}`).join("\n\n");
      // Aerob effektivitet
      const aeroCtx=aeroData.length?`\nAEROB EFFEKTIVITET (lugna pass >5km):\n${aeroData.map(a=>`${a.fullDate}: ${a.km}km pace:${a.pace.toFixed(2)}min/km HR:${a.hr} eff:${a.eff}`).join("\n")}\nTrend senaste 10: pace ${aeroData[aeroData.length-1]?.trendPace}min/km, HR ${aeroData[aeroData.length-1]?.trendHr}\n`:"";
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1500,
          system:`Du är en löpcoach. Löparen tränar mot Lidingöloppet 30km (26 sep 2026, mål sub 2:00).
Resultat: 10K 37:40, HM 1:25:30, 5K 18:45, 3K 11:05. Fjällmaraton 45K/2000hm. Toughest Lida 8.4km/368hm.
KOMPLETT HISTORIK (dec 2025–jun 2026):
${ctx}
${aeroCtx}
Svara kort på svenska. Referera till specifika pass. Ge konkreta förslag med tempo, distans, vila.`,
          messages:[...msgs.filter((m,i)=>i>0).slice(-6),{role:"user",content:userMsg}]})});
      const data=await res.json();
      setMsgs(p=>[...p,{role:"assistant",content:data.content?.map(c=>c.text||"").join("")||"Kunde inte svara."}]);
    }catch(e){setMsgs(p=>[...p,{role:"assistant",content:"Kunde inte nå AI. Kontrollera anslutning."}]);}
    setChatL(false);
  };

  useEffect(()=>{chatE.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const totalKm=acts.filter(a=>a.date>="2026-01-01").reduce((s,a)=>s+a.km,0);
  const races=acts.filter(a=>a.type==="race");
  const daysLeft=Math.ceil((new Date("2026-09-26")-new Date("2026-06-19"))/864e5);

  const tabs=[
    {id:"activities",l:"Aktiviteter",i:"📋"},{id:"volume",l:"Volym",i:"📊"},
    {id:"aero",l:"Effektivitet",i:"❤️"},{id:"plan",l:"Plan",i:"📅"},
    {id:"race",l:"Lopp",i:"🏁"},{id:"strategy",l:"Tempo",i:"⚡"},{id:"chat",l:"Coach",i:"💬"},
  ];

  const PaceTooltip=({active,payload})=>{
    if(!active||!payload?.length) return null;
    const d=payload[0]?.payload;if(!d) return null;
    const pm=Math.floor(d.pace),ps=Math.round((d.pace%1)*60);
    return(<div style={{background:"#1A1C24",border:"1px solid #2A2D35",borderRadius:8,padding:"8px 12px",fontSize:11,color:"#DCE1EB"}}>
      <div style={{fontWeight:600}}>{d.fullDate} — {d.name}</div>
      <div>{d.km}km · {pm}:{ps<10?'0':''}{ ps}/km · HR {d.hr} · Eff {d.eff}</div>
    </div>);
  };

  return(
    <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:"#0C0E12",color:"#D2D7E1",minHeight:"100vh"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{background:"linear-gradient(135deg,#141923,#1E140F)",padding:"20px 20px 12px",borderBottom:"1px solid rgba(255,200,60,0.15)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{...M,fontSize:10,color:"#F0B428",letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>{daysLeft} dagar kvar</div>
            <h1 style={{fontSize:18,fontWeight:700,margin:"0 0 1px",color:"#F5F8FF"}}>Lidingöloppet 30K</h1>
            <div style={{fontSize:11,color:"#8C919B"}}>26 sep · Sub 2:00 · 550 hm</div>
          </div>
          <div style={{textAlign:"right"}}><div style={{...M,fontSize:18,fontWeight:700,color:"#F0B428"}}>{totalKm.toFixed(0)}</div><div style={{fontSize:9,color:"#787E8C"}}>km 2026</div></div>
        </div>
      </div>

      <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.07)",background:"#101218",overflowX:"auto"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);setSel(null);setLegend(null);}} style={{
            flex:"0 0 auto",padding:"9px 8px",background:"none",border:"none",
            borderBottom:tab===t.id?"2px solid #F0B428":"2px solid transparent",
            color:tab===t.id?"#F0B428":"#646973",fontSize:10,fontWeight:tab===t.id?600:400,
            fontFamily:"'DM Sans',sans-serif",cursor:"pointer",whiteSpace:"nowrap"
          }}>{t.i} {t.l}</button>
        ))}
      </div>

      <div style={{padding:"12px 16px",paddingBottom:legend?170:12}}>

        {/* ACTIVITIES */}
        {tab==="activities"&&!sel&&(<div>
          <div style={{display:"flex",gap:3,marginBottom:10,flexWrap:"wrap"}}>
            {[["all","Alla","#D2D7E1"],...Object.entries(CATEGORIES).map(([k,v])=>[k,v.label,v.color])].map(([k,l,c])=>(
              <button key={k} onClick={()=>{setFilter(k);setLegend(filter===k&&legend===k?null:k);}} style={{
                padding:"4px 9px",borderRadius:10,border:"none",fontSize:10,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
                background:filter===k?c:"rgba(255,255,255,0.05)",color:filter===k?"#0C0E12":"#8C919B",fontWeight:filter===k?600:400
              }}>{l}</button>
            ))}
          </div>
          {filtered.map(a=>{const c=CATEGORIES[a.type]||CATEGORIES.easy;return(
            <button key={a.id} onClick={()=>setSel(a)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"10px 10px",marginBottom:4,borderRadius:7,border:"none",background:"#14161C",cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans',sans-serif"}}>
              <div style={{width:3,height:28,borderRadius:2,background:c.color,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between"}}><div style={{fontSize:11,fontWeight:600,color:a.type==="race"?"#F0B428":"#DCE1EB",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"65%"}}>{a.name}</div><div style={{...M,fontSize:10,color:"#A0A5B0"}}>{a.time}</div></div>
                <div style={{display:"flex",gap:8,marginTop:1,fontSize:9,color:"#787E8C"}}><span>{a.date}</span><span style={M}>{a.km}km</span><span style={M}>{a.pace}/km</span>{a.hr>0&&<span>♥{a.hr}</span>}{a.el>0&&<span>↑{a.el}m</span>}</div>
              </div>
            </button>
          );})}
          {legend&&legend!=="all"&&CATEGORIES[legend]&&(
            <div style={{position:"fixed",bottom:0,left:0,right:0,padding:"14px 20px 22px",background:"linear-gradient(0deg,#14161C 80%,transparent)",borderTop:"1px solid rgba(255,255,255,0.1)",zIndex:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <div style={{width:8,height:8,borderRadius:4,background:CATEGORIES[legend].color}}/><div style={{fontSize:12,fontWeight:600,color:CATEGORIES[legend].color}}>{CATEGORIES[legend].label}</div>
                <button onClick={()=>setLegend(null)} style={{marginLeft:"auto",background:"none",border:"none",color:"#787E8C",cursor:"pointer",fontSize:14}}>✕</button>
              </div>
              <div style={{fontSize:11,color:"#A0A5B0",lineHeight:1.5}}>{CATEGORIES[legend].desc}</div>
            </div>
          )}
        </div>)}

        {tab==="activities"&&sel&&(<div>
          <button onClick={()=>setSel(null)} style={{background:"none",border:"none",color:"#F0B428",fontSize:11,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:"3px 0",marginBottom:8}}>← Tillbaka</button>
          <div style={{background:"#14161C",borderRadius:10,padding:16,border:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{...M,fontSize:9,color:CATEGORIES[sel.type]?.color,letterSpacing:1.5,textTransform:"uppercase",marginBottom:2}}>{CATEGORIES[sel.type]?.label} · {sel.date}</div>
            <h2 style={{fontSize:16,fontWeight:700,color:sel.type==="race"?"#F0B428":"#F5F8FF",margin:"0 0 12px"}}>{sel.name}</h2>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {[["Distans",`${sel.km} km`],["Tid",sel.time],["Tempo",`${sel.pace}/km`],["Höjdmeter",`${sel.el} m`],["Snittpuls",sel.hr>0?`${sel.hr}`:"—"],["Maxpuls",sel.mhr>0?`${sel.mhr}`:"—"]].map(([l,v],i)=>(
                <div key={i} style={{background:"rgba(255,255,255,0.03)",borderRadius:6,padding:8,border:"1px solid rgba(255,255,255,0.05)"}}>
                  <div style={{fontSize:8,...M,color:"#787E8C",letterSpacing:1,textTransform:"uppercase"}}>{l}</div>
                  <div style={{fontSize:16,fontWeight:700,...M,color:"#DCE1EB",marginTop:1}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>)}

        {/* VOLUME */}
        {tab==="volume"&&(<div>
          <div style={{fontSize:12,fontWeight:600,color:"#DCE1EB",marginBottom:3}}>Veckovolym (km)</div>
          <div style={{fontSize:10,color:"#787E8C",marginBottom:10}}>12 veckor · Streckad = 4v rullande snitt</div>
          <div style={{background:"#14161C",borderRadius:10,padding:"14px 6px 6px",border:"1px solid rgba(255,255,255,0.06)"}}>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={wkData} margin={{top:5,right:8,left:-20,bottom:5}}>
                <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F0B428" stopOpacity={0.3}/><stop offset="95%" stopColor="#F0B428" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="mon" tick={{fontSize:9,fill:"#787E8C"}} axisLine={{stroke:"#2A2D35"}} tickLine={false}/>
                <YAxis tick={{fontSize:9,fill:"#787E8C"}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:"#1A1C24",border:"1px solid #2A2D35",borderRadius:6,fontSize:11}} formatter={(v,n)=>[`${v} km`,n==="km"?"Volym":"4v snitt"]}/>
                <Area type="monotone" dataKey="km" stroke="#F0B428" strokeWidth={2} fill="url(#g1)" dot={{r:3,fill:"#F0B428",stroke:"#0C0E12",strokeWidth:2}}/>
                <Line type="monotone" dataKey="avg" stroke="#DC6444" strokeWidth={2} strokeDasharray="5 3" dot={false}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div style={{display:"flex",gap:12,marginTop:8,justifyContent:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:2,background:"#F0B428"}}/><span style={{fontSize:9,color:"#8C919B"}}>Veckovolym</span></div>
            <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:2,background:"#DC6444",borderTop:"1px dashed #DC6444"}}/><span style={{fontSize:9,color:"#8C919B"}}>4v snitt</span></div>
          </div>
        </div>)}

        {/* AEROBIC EFFICIENCY */}
        {tab==="aero"&&(<div>
          <div style={{fontSize:12,fontWeight:600,color:"#DCE1EB",marginBottom:2}}>Aerob effektivitet</div>
          <div style={{fontSize:10,color:"#787E8C",marginBottom:10}}>Lugna pass &gt;5km — snabbare tempo vid samma puls = bättre aerob form</div>

          {/* Pace chart */}
          <div style={{background:"#14161C",borderRadius:10,padding:"12px 6px 6px",border:"1px solid rgba(255,255,255,0.06)",marginBottom:10}}>
            <div style={{fontSize:10,color:"#8C919B",padding:"0 8px 4px"}}>Tempo (min/km) — lägre = snabbare</div>
            <ResponsiveContainer width="100%" height={150}>
              <ComposedChart data={aeroData} margin={{top:5,right:8,left:-20,bottom:5}}>
                <XAxis dataKey="date" tick={{fontSize:8,fill:"#787E8C"}} axisLine={{stroke:"#2A2D35"}} tickLine={false}/>
                <YAxis domain={['auto','auto']} reversed tick={{fontSize:9,fill:"#787E8C"}} axisLine={false} tickLine={false}/>
                <Tooltip content={<PaceTooltip/>}/>
                <Line type="monotone" dataKey="pace" stroke="#40A878" strokeWidth={1.5} dot={{r:3,fill:"#40A878",stroke:"#0C0E12",strokeWidth:1.5}}/>
                <Line type="monotone" dataKey="trendPace" stroke="#40A878" strokeWidth={2} strokeDasharray="5 3" dot={false} opacity={0.6}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* HR chart */}
          <div style={{background:"#14161C",borderRadius:10,padding:"12px 6px 6px",border:"1px solid rgba(255,255,255,0.06)",marginBottom:10}}>
            <div style={{fontSize:10,color:"#8C919B",padding:"0 8px 4px"}}>Snittpuls (bpm) — lägre vid samma tempo = bättre</div>
            <ResponsiveContainer width="100%" height={150}>
              <ComposedChart data={aeroData} margin={{top:5,right:8,left:-20,bottom:5}}>
                <XAxis dataKey="date" tick={{fontSize:8,fill:"#787E8C"}} axisLine={{stroke:"#2A2D35"}} tickLine={false}/>
                <YAxis domain={['auto','auto']} tick={{fontSize:9,fill:"#787E8C"}} axisLine={false} tickLine={false}/>
                <Tooltip content={<PaceTooltip/>}/>
                <Line type="monotone" dataKey="hr" stroke="#DC6444" strokeWidth={1.5} dot={{r:3,fill:"#DC6444",stroke:"#0C0E12",strokeWidth:1.5}}/>
                <Line type="monotone" dataKey="trendHr" stroke="#DC6444" strokeWidth={2} strokeDasharray="5 3" dot={false} opacity={0.6}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Efficiency index */}
          <div style={{background:"#14161C",borderRadius:10,padding:"12px 6px 6px",border:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{fontSize:10,color:"#8C919B",padding:"0 8px 4px"}}>Effektivitetsindex (hastighet/puls × 1000) — högre = bättre</div>
            <ResponsiveContainer width="100%" height={150}>
              <ComposedChart data={aeroData} margin={{top:5,right:8,left:-20,bottom:5}}>
                <XAxis dataKey="date" tick={{fontSize:8,fill:"#787E8C"}} axisLine={{stroke:"#2A2D35"}} tickLine={false}/>
                <YAxis domain={['auto','auto']} tick={{fontSize:9,fill:"#787E8C"}} axisLine={false} tickLine={false}/>
                <Tooltip content={<PaceTooltip/>}/>
                <Area type="monotone" dataKey="eff" stroke="#F0B428" strokeWidth={1.5} fill="rgba(240,180,40,0.1)" dot={{r:3,fill:"#F0B428",stroke:"#0C0E12",strokeWidth:1.5}}/>
                <Line type="monotone" dataKey="trendEff" stroke="#F0B428" strokeWidth={2} strokeDasharray="5 3" dot={false} opacity={0.6}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div style={{display:"flex",gap:8,marginTop:8,justifyContent:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:9,color:"#40A878"}}>━ Tempo</span>
            <span style={{fontSize:9,color:"#DC6444"}}>━ Puls</span>
            <span style={{fontSize:9,color:"#F0B428"}}>━ Effektivitet</span>
            <span style={{fontSize:9,color:"#8C919B"}}>╌ 10-pass trendlinje</span>
          </div>

          <div style={{marginTop:12,padding:12,borderRadius:8,background:"rgba(60,160,120,0.08)",border:"1px solid rgba(60,160,120,0.2)",fontSize:11,color:"#78C8A0",lineHeight:1.5}}>
            <strong>Tolkning:</strong> Om tempografen sjunker (snabbare) medan pulsgrafen är stabil eller sjunker → din aeroba form förbättras. Effektivitetsindexet kombinerar båda: stigande trend = du springer snabbare per pulsslag.
          </div>
        </div>)}

        {/* PLAN */}
        {tab==="plan"&&(<div>
          <div style={{background:"#14161C",borderRadius:8,padding:10,marginBottom:10,border:"1px solid rgba(255,255,255,0.06)",fontSize:10,color:"#8C919B",lineHeight:1.4}}>
            <span style={{fontWeight:600,color:"#DCE1EB"}}>14v uppladdning</span> · Bas → Specifik → Toppform → Taper · 50–65 km/v
          </div>
          {PLAN.map((p,i)=>{const isE=expW===i,isR=p.f.includes("RACE");return(
            <div key={i} style={{marginBottom:6,borderRadius:8,border:isR?"1px solid rgba(240,180,40,0.25)":"1px solid rgba(255,255,255,0.06)",background:"#14161C",overflow:"hidden"}}>
              <button onClick={()=>setExpW(isE?-1:i)} style={{width:"100%",padding:"10px 12px",background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textAlign:"left"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontSize:12,fontWeight:600,color:isR?"#FFD246":"#DCE1EB"}}>{p.w} <span style={{fontWeight:400,color:"#787E8C",fontSize:10}}>({p.d})</span></div>
                  <div style={{fontSize:9,color:"#787E8C",marginTop:1}}>{p.f}</div></div>
                  <div style={{...M,fontSize:13,fontWeight:600,color:"#B4B9C3"}}>{p.km}km</div>
                </div>
                <div style={{display:"flex",height:5,borderRadius:3,overflow:"hidden",marginTop:6,gap:1}}>
                  {Object.entries(p.pct).map(([k,v])=>(<div key={k} style={{width:`${v}%`,background:iC[k]||"#586070",minWidth:v>0?2:0}}/>))}
                </div>
                <div style={{display:"flex",gap:6,marginTop:3}}>{Object.entries(p.pct).map(([k,v])=>(<span key={k} style={{fontSize:8,color:iC[k]||"#586070"}}>{CATEGORIES[k]?.label||k} {v}%</span>))}</div>
              </button>
              {isE&&(<div style={{padding:"0 12px 10px",fontSize:11,color:"#A0A5B0",lineHeight:1.7}}>{p.days.split("·").map((d,j)=><div key={j}>{d.trim()}</div>)}</div>)}
            </div>
          );})}
        </div>)}

        {/* RACE */}
        {tab==="race"&&(<div>
          <div style={{background:"#14161C",borderRadius:10,padding:14,marginBottom:10,border:"1px solid rgba(240,180,40,0.2)"}}>
            <div style={{...M,fontSize:9,color:"#F0B428",letterSpacing:1.5,textTransform:"uppercase"}}>Lördag 26 september 2026</div>
            <div style={{fontSize:15,fontWeight:700,color:"#F5F8FF",marginTop:1}}>TCS Lidingöloppet 30K</div>
            <div style={{fontSize:10,color:"#787E8C",marginBottom:10}}>30 km · ~550 hm · Terräng</div>
            {[{l:"STRETCH",t:"Sub 2:00",p:"4:00/km",d:"HM-tempo i 30km terräng. Perfekt dag.",a:true},{l:"A-MÅL",t:"2:02–2:05",p:"4:05–4:10/km",d:"Realistiskt ambitiöst. Flat 30km ~2:02 + terräng."},{l:"B-MÅL",t:"Sub 2:10",p:"4:20/km",d:"Solid. Kraft kvar sista milen."}].map((g,i)=>(
              <div key={i} style={{padding:10,borderRadius:6,marginBottom:5,background:g.a?"linear-gradient(135deg,rgba(240,180,40,0.12),rgba(240,180,40,0.04))":"rgba(255,255,255,0.03)",border:g.a?"1px solid rgba(240,180,40,0.2)":"1px solid rgba(255,255,255,0.06)"}}>
                <div style={{display:"flex",justifyContent:"space-between"}}><span style={{...M,fontSize:8,color:g.a?"#F0B428":"#787E8C",letterSpacing:1}}>{g.l}</span><span style={{...M,fontSize:8,color:"#8C919B"}}>{g.p}</span></div>
                <div style={{...M,fontSize:18,fontWeight:700,color:g.a?"#FFD246":"#B4B9C3",marginTop:1}}>{g.t}</div>
                <div style={{fontSize:10,color:"#8C919B",marginTop:2}}>{g.d}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,fontWeight:600,color:"#DCE1EB",marginBottom:6}}>Lopphistorik</div>
          {races.map(r=>(<div key={r.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 10px",marginBottom:4,borderRadius:6,background:"#14161C",border:"1px solid rgba(255,255,255,0.06)"}}>
            <div><div style={{fontSize:11,fontWeight:600,color:"#F0B428"}}>{r.name}</div><div style={{fontSize:9,color:"#787E8C",marginTop:1}}>{r.date} · {r.km}km</div></div>
            <div style={{textAlign:"right"}}><div style={{...M,fontSize:14,fontWeight:700,color:"#DCE1EB"}}>{r.time}</div><div style={{...M,fontSize:9,color:"#8C919B"}}>{r.pace}/km</div></div>
          </div>))}
        </div>)}

        {/* STRATEGY */}
        {tab==="strategy"&&(<div>
          <div style={{background:"#14161C",borderRadius:8,padding:12,border:"1px solid rgba(240,180,40,0.2)",marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:600,color:"#FFD246"}}>Lidingöloppet — Tempostrategi</div>
            <div style={{fontSize:10,color:"#8C919B"}}>Negativ split · hushålla inför sista milen</div>
          </div>
          <div style={{background:"#14161C",borderRadius:8,overflow:"hidden",border:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{display:"grid",gridTemplateColumns:"48px 56px 52px 1fr",padding:"7px 10px",fontSize:8,...M,color:"#5A5F69",borderBottom:"1px solid rgba(255,255,255,0.06)",textTransform:"uppercase",letterSpacing:1}}><div>KM</div><div>PACE</div><div>TOT</div><div>KOMMENTAR</div></div>
            {PACE.map((s,i)=>{const h=i>=5;return(
              <div key={i} style={{display:"grid",gridTemplateColumns:"48px 56px 52px 1fr",padding:"8px 10px",borderBottom:i<PACE.length-1?"1px solid rgba(255,255,255,0.04)":"none",background:h?"rgba(220,100,60,0.08)":"transparent",fontSize:10}}>
                <div style={{...M,fontWeight:600,color:h?"#F08C64":"#B4B9C3"}}>{s.km}</div><div style={{...M,color:h?"#FFA078":"#A0A5B0"}}>{s.p}</div><div style={{...M,color:"#787E8C",fontSize:9}}>{s.t}</div><div style={{color:"#8C919B",lineHeight:1.3,fontSize:9}}>{s.n}</div>
              </div>);})}
          </div>
        </div>)}

        {/* COACH */}
        {tab==="chat"&&(<div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 160px)"}}>
          <div style={{flex:1,overflowY:"auto",paddingBottom:6}}>
            {msgs.map((m,i)=>(<div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:6}}>
              <div style={{maxWidth:"85%",padding:"9px 12px",borderRadius:10,fontSize:11,lineHeight:1.5,
                background:m.role==="user"?"rgba(240,180,40,0.15)":"#14161C",color:m.role==="user"?"#F0D070":"#C8CDD7",
                border:m.role==="user"?"1px solid rgba(240,180,40,0.2)":"1px solid rgba(255,255,255,0.06)",
                borderBottomRightRadius:m.role==="user"?3:10,borderBottomLeftRadius:m.role==="assistant"?3:10,whiteSpace:"pre-wrap"}}>{m.content}</div>
            </div>))}
            {chatL&&<div style={{padding:"9px 12px",borderRadius:10,background:"#14161C",border:"1px solid rgba(255,255,255,0.06)",fontSize:11,color:"#787E8C",display:"inline-block"}}>Tänker...</div>}
            <div ref={chatE}/>
          </div>
          <div style={{display:"flex",gap:6,paddingTop:6,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
            <input value={chatIn} onChange={e=>setChatIn(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat();}}}
              placeholder="Fråga om träning eller be om planändringar..." style={{flex:1,padding:"9px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"#14161C",color:"#D2D7E1",fontSize:11,fontFamily:"'DM Sans',sans-serif",outline:"none"}}/>
            <button onClick={sendChat} disabled={chatL} style={{padding:"9px 14px",borderRadius:8,border:"none",background:"#F0B428",color:"#0C0E12",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",opacity:chatL?0.5:1}}>Skicka</button>
          </div>
        </div>)}
      </div>
    </div>
  );
}
