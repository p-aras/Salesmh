// BusinessHoursGate.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

const TZ = "Asia/Kolkata";
const OPEN = { h: 9, m: 0 };   // 09:00
const CLOSE = { h: 21, m: 0 }; // 21:00
const WORKING_DAYS = [1,2,3,4,5,6]; // Mon..Sat (0=Sun)

function zonedNow(tz) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  });
  const p = Object.fromEntries(f.formatToParts().map(x => [x.type, x.value]));
  return new Date(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.000`);
}
function anchor(tz, d, h, m) {
  const y = d.getFullYear(), mo = d.getMonth()+1, da = d.getDate();
  return new Date(`${y}-${String(mo).padStart(2,"0")}-${String(da).padStart(2,"0")}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00.000`);
}
function nextBoundary(now, open, close) {
  const openT = anchor(TZ, now, open.h, open.m);
  const closeT = anchor(TZ, now, close.h, close.m);
  const isWorkDay = WORKING_DAYS.includes(now.getDay());
  if (!isWorkDay) {
    const n = new Date(now);
    do { n.setDate(n.getDate()+1); } while (!WORKING_DAYS.includes(n.getDay()));
    return anchor(TZ, n, open.h, open.m).getTime();
  }
  if (now < openT) return openT.getTime();
  if (now < closeT) return closeT.getTime();
  const n = new Date(now);
  do { n.setDate(n.getDate()+1); } while (!WORKING_DAYS.includes(n.getDay()));
  return anchor(TZ, n, open.h, open.m).getTime();
}
function isOpenNow(now) {
  const isWorkDay = WORKING_DAYS.includes(now.getDay());
  if (!isWorkDay) return false;
  const openT = anchor(TZ, now, OPEN.h, OPEN.m);
  const closeT = anchor(TZ, now, CLOSE.h, CLOSE.m);
  return now >= openT && now < closeT;
}

export function useBusinessHours() {
  const [state, setState] = useState(() => {
    const now = zonedNow(TZ);
    return { isOpen: isOpenNow(now), nextTs: nextBoundary(now, OPEN, CLOSE) };
  });
  const timerRef = useRef(null);

  useEffect(() => {
    const tick = () => {
      const now = zonedNow(TZ);
      setState({ isOpen: isOpenNow(now), nextTs: nextBoundary(now, OPEN, CLOSE) });
      const ms = Math.max(1000, nextBoundary(now, OPEN, CLOSE) - now.getTime());
      timerRef.current = setTimeout(tick, ms);
    };
    tick();
    const onVis = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVis);
    return () => { clearTimeout(timerRef.current); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  return state; // { isOpen, nextTs }
}

export default function BusinessHoursGate({ children }) {
  const { isOpen } = useBusinessHours();
  if (isOpen) return children;

  // simple locked screen
  return (
    <div style={{minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center"}}>
      <div style={{maxWidth: 560, padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)"}}>
        <h2 style={{margin: 0, marginBottom: 6}}>⏰ Closed</h2>
        <p style={{opacity: .8}}>Working hours are <b>9:00 AM → 9:00 PM (IST)</b>, Mon–Sat.</p>
      </div>
    </div>
  );
}
