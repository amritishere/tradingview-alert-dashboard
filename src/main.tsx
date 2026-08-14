import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Filter,
  RefreshCw,
  Search,
  X,
  Zap,
} from "lucide-react";
import "./styles.css";

const API_BASE = "https://api.monkalphacapital.com";
const POLL_MS = 5000;
const TIME_ZONE = "Asia/Kolkata";

type Alert = {
  id: number;
  ticker: string;
  price: number | null;
  alert_type: string | null;
  message: string | null;
  timeframe: string | null;
  exchange: string | null;
  triggered_at: string | null;
  received_at: string;
  raw_payload?: string;
  created_at?: string;
};

type ApiResponse = {
  success: boolean;
  count?: number;
  alerts?: Alert[];
  error?: string;
};

const dateKey = (value: string | null) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value || ""));

const formatDate = (value: string | null) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value || ""));

const formatTime = (value: string | null) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(value || ""));

const formatUpdated = (value: Date) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(value);

const messageText = (message: string | null) => {
  if (!message) return "No message";
  return message === "{{alert_message}}" ? "TradingView Alert" : message;
};

const buildTradingViewUrl = (ticker: string, exchange?: string | null) => {
  const symbol = exchange ? `${exchange}:${ticker}` : ticker;
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
};

function App() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedDate, setSelectedDate] = useState("all");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [exchange, setExchange] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sound, setSound] = useState(false);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const knownIds = useRef<Set<number>>(new Set());
  const firstLoad = useRef(true);

  const loadAlerts = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/alerts`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApiResponse = await res.json();
      if (!data.success) throw new Error(data.error || "API error");

      const incoming = data.alerts || [];
      const fresh = incoming.filter((a) => !knownIds.current.has(a.id));

      setAlerts((current) => {
        const map = new Map<number, Alert>();
        [...incoming, ...current].forEach((a) => map.set(a.id, a));
        return [...map.values()].sort(
          (a, b) =>
            new Date(b.triggered_at || b.received_at).getTime() -
            new Date(a.triggered_at || a.received_at).getTime()
        );
      });

      incoming.forEach((a) => knownIds.current.add(a.id));
      setOnline(true);
      setLastUpdate(new Date());

      if (!firstLoad.current && fresh.length) {
        setNewIds(new Set(fresh.map((a) => a.id)));
        window.setTimeout(() => setNewIds(new Set()), 8000);

        if (sound) {
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = 880;
            gain.gain.value = 0.035;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
          } catch {}
        }
      }
      firstLoad.current = false;
    } catch {
      setOnline(false);
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    const timer = window.setInterval(() => loadAlerts(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [sound]);

  const todayKey = dateKey(new Date().toISOString());

  const dates = useMemo(() => {
    const unique = new Set<string>();
    alerts.forEach((a) => unique.add(dateKey(a.triggered_at || a.received_at)));
    return [...unique].sort().reverse();
  }, [alerts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alerts.filter((a) => {
      const date = dateKey(a.triggered_at || a.received_at);
      const matchesDate = selectedDate === "all" || date === selectedDate;
      const matchesType = type === "all" || (a.alert_type || "") === type;
      const matchesExchange = exchange === "all" || (a.exchange || "") === exchange;
      const haystack = [a.ticker, a.message, a.alert_type, a.exchange, a.timeframe]
        .join(" ")
        .toLowerCase();
      return matchesDate && matchesType && matchesExchange && (!q || haystack.includes(q));
    });
  }, [alerts, selectedDate, search, type, exchange]);

  const todayAlerts = alerts.filter(
    (a) => dateKey(a.triggered_at || a.received_at) === todayKey
  ).length;

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekAlerts = alerts.filter((a) => new Date(a.triggered_at || a.received_at) >= weekStart).length;

  const uniqueToday = new Set(
    alerts
      .filter((a) => dateKey(a.triggered_at || a.received_at) === todayKey)
      .map((a) => a.ticker.toUpperCase())
  ).size;

  const types = [...new Set(alerts.map((a) => a.alert_type).filter(Boolean))] as string[];
  const exchanges = [...new Set(alerts.map((a) => a.exchange).filter(Boolean))] as string[];

  const grouped = useMemo(() => {
    const groups = new Map<string, Alert[]>();
    filtered.forEach((alert) => {
      const key = dateKey(alert.triggered_at || alert.received_at);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(alert);
    });
    return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const clearFilters = () => {
    setSelectedDate("all");
    setType("all");
    setExchange("all");
    setSearch("");
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Zap size={17} strokeWidth={2.5} /></div>
          <div>
            <div className="brand-title">Monk Alpha Capital</div>
            <div className="brand-subtitle">TradingView Alert Monitor</div>
          </div>
        </div>

        <div className="top-actions">
          <div className={`status ${online ? "live" : "offline"}`}>
            <span className="status-dot" />
            {online ? "LIVE" : "OFFLINE"}
          </div>
          <span className="last-update">
            {lastUpdate ? `Updated ${formatUpdated(lastUpdate)} IST` : "Connecting..."}
          </span>
          <button className="icon-btn" onClick={() => loadAlerts(true)} title="Refresh alerts" aria-label="Refresh alerts">
            <RefreshCw size={17} className={refreshing ? "spin" : ""} />
          </button>
        </div>
      </header>

      <main className="container">
        <section className="intro">
          <div>
            <div className="kicker"><span /> REAL-TIME ALERT FEED</div>
            <h1>TradingView Alerts</h1>
            <p>Every alert received by Monk Alpha Capital, organized and searchable.</p>
          </div>
          <button className={`sound-toggle ${sound ? "active" : ""}`} onClick={() => setSound(!sound)}>
            <Activity size={15} />
            Sound {sound ? "On" : "Off"}
          </button>
        </section>

        <section className="stats">
          <Stat label="Today" value={todayAlerts} />
          <Stat label="Last 7 Days" value={weekAlerts} />
          <Stat label="Unique Stocks Today" value={uniqueToday} />
          <Stat label="Stored Alerts" value={alerts.length} />
        </section>

        <section className="toolbar">
          <div className="search-box">
            <Search size={17} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ticker, exchange or alert..." />
            {search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={15} /></button>}
          </div>
          <div className="toolbar-actions">
            <button className="filter-toggle" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={16} /> Filters <ChevronDown size={15} className={showFilters ? "rotate" : ""} />
            </button>
            <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} aria-label="Filter by date">
              <option value="all">All Dates</option>
              <option value={todayKey}>Today</option>
              {dates.filter((d) => d !== todayKey).slice(0, 30).map((d) => (
                <option key={d} value={d}>{formatDate(d + "T12:00:00Z")}</option>
              ))}
            </select>
          </div>
        </section>

        {showFilters && (
          <section className="filters">
            <label>Alert Type
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="all">All Types</option>
                {types.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label>Exchange
              <select value={exchange} onChange={(e) => setExchange(e.target.value)}>
                <option value="all">All Exchanges</option>
                {exchanges.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <button className="clear-btn" onClick={clearFilters}>Clear filters</button>
          </section>
        )}

        <div className="feed-header">
          <div>
            <span className="section-title">{selectedDate === "all" ? "Alert History" : formatDate(selectedDate + "T12:00:00Z")}</span>
            <span className="result-count">{filtered.length} {filtered.length === 1 ? "alert" : "alerts"}</span>
          </div>
          <span className="polling"><span /> Auto-refresh every 5s</span>
        </div>

        <section className="feed">
          {loading ? (
            <div className="state"><div className="loader" /><span>Loading alerts...</span></div>
          ) : filtered.length === 0 ? (
            <div className="state empty">
              <CalendarDays size={28} />
              <strong>{alerts.length ? "No matching alerts" : "No alerts received yet"}</strong>
              <span>{alerts.length ? "Try changing your search or filters." : "Waiting for the first TradingView alert."}</span>
            </div>
          ) : (
            grouped.map(([groupDate, groupAlerts]) => (
              <div className="date-group" key={groupDate}>
                <div className="date-heading">
                  <span>{groupDate === todayKey ? "TODAY" : formatDate(groupDate + "T12:00:00Z").toUpperCase()}</span>
                  <i />
                  <small>{groupAlerts.length} {groupAlerts.length === 1 ? "alert" : "alerts"}</small>
                </div>
                {groupAlerts.map((alert) => (
                  <article className={`alert-row ${newIds.has(alert.id) ? "new-alert" : ""}`} key={alert.id} onClick={() => setSelectedAlert(alert)}>
                    <div className="alert-time">
                      <strong>{formatTime(alert.triggered_at || alert.received_at)}</strong>
                      <span>IST</span>
                    </div>
                    <div className="ticker">
                      <strong>{alert.ticker}</strong>
                      <span>{alert.exchange || "—"}</span>
                    </div>
                    <div className="price">
                      <strong>{alert.price == null ? "—" : `$${Number(alert.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`}</strong>
                      <span>{alert.timeframe ? `${alert.timeframe} min` : "—"}</span>
                    </div>
                    <div className="alert-info">
                      <div className="type-line">
                        <span className={`type-dot ${/buy|long|bull/i.test(alert.alert_type || alert.message || "") ? "positive" : /sell|short|bear/i.test(alert.alert_type || alert.message || "") ? "negative" : ""}`} />
                        <strong>{alert.alert_type || "TradingView Alert"}</strong>
                        {newIds.has(alert.id) && <em>NEW</em>}
                      </div>
                      <p>{messageText(alert.message)}</p>
                    </div>
                    <div className="row-actions">
                      <button className="tv-btn" onClick={(e) => { e.stopPropagation(); window.open(buildTradingViewUrl(alert.ticker, alert.exchange), "_blank", "noopener,noreferrer"); }}>
                        Open TradingView <ExternalLink size={14} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ))
          )}
        </section>
      </main>

      {selectedAlert && (
        <div className="modal-backdrop" onClick={() => setSelectedAlert(null)}>
          <aside className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="detail-head">
              <div>
                <span className="eyebrow">Alert #{selectedAlert.id}</span>
                <h2>{selectedAlert.ticker}</h2>
                <span className="detail-date">{formatDate(selectedAlert.triggered_at || selectedAlert.received_at)} · {formatTime(selectedAlert.triggered_at || selectedAlert.received_at)} IST</span>
              </div>
              <button className="icon-btn" onClick={() => setSelectedAlert(null)} aria-label="Close alert details"><X size={18} /></button>
            </div>
            <div className="detail-grid">
              <Detail label="Price" value={selectedAlert.price == null ? "—" : `$${selectedAlert.price}`} />
              <Detail label="Exchange" value={selectedAlert.exchange || "—"} />
              <Detail label="Timeframe" value={selectedAlert.timeframe ? `${selectedAlert.timeframe} min` : "—"} />
              <Detail label="Type" value={selectedAlert.alert_type || "TradingView Alert"} />
              <Detail label="Triggered" value={`${formatDate(selectedAlert.triggered_at)} · ${formatTime(selectedAlert.triggered_at)} IST`} />
              <Detail label="Received" value={`${formatDate(selectedAlert.received_at)} · ${formatTime(selectedAlert.received_at)} IST`} />
            </div>
            <div className="message-block">
              <span className="eyebrow">Message</span>
              <p>{messageText(selectedAlert.message)}</p>
            </div>
            {selectedAlert.raw_payload && (
              <details className="raw">
                <summary>Raw payload</summary>
                <pre>{(() => { try { return JSON.stringify(JSON.parse(selectedAlert.raw_payload!), null, 2); } catch { return selectedAlert.raw_payload; } })()}</pre>
              </details>
            )}
            <button className="primary-btn" onClick={() => window.open(buildTradingViewUrl(selectedAlert.ticker, selectedAlert.exchange), "_blank", "noopener,noreferrer")}>
              Open TradingView <ExternalLink size={15} />
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="stat"><span>{label}</span><strong>{value.toLocaleString()}</strong></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

createRoot(document.getElementById("root")!).render(<App />);
