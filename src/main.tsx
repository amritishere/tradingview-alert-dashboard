
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Filter,
  Menu,
  RefreshCw,
  Search,
  X,
  Zap,
} from "lucide-react";
import "./styles.css";

const API_BASE = "https://api.monkalphacapital.com";
const POLL_MS = 5000;

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
      const hasNew = incoming.some((a) => !knownIds.current.has(a.id));

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

      if (!firstLoad.current && hasNew && sound) {
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

  const todayKey = new Date().toLocaleDateString("en-CA");

  const dates = useMemo(() => {
    const unique = new Set<string>();
    alerts.forEach((a) => {
      const d = new Date(a.triggered_at || a.received_at);
      if (!Number.isNaN(d.getTime())) unique.add(d.toLocaleDateString("en-CA"));
    });
    return [...unique].sort().reverse();
  }, [alerts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alerts.filter((a) => {
      const date = new Date(a.triggered_at || a.received_at).toLocaleDateString("en-CA");
      const matchesDate = selectedDate === "all" || date === selectedDate;
      const matchesType = type === "all" || (a.alert_type || "") === type;
      const matchesExchange = exchange === "all" || (a.exchange || "") === exchange;
      const haystack = [
        a.ticker,
        a.message,
        a.alert_type,
        a.exchange,
        a.timeframe,
      ].join(" ").toLowerCase();
      return matchesDate && matchesType && matchesExchange && (!q || haystack.includes(q));
    });
  }, [alerts, selectedDate, search, type, exchange]);

  const todayAlerts = alerts.filter(
    (a) => new Date(a.triggered_at || a.received_at).toLocaleDateString("en-CA") === todayKey
  ).length;

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekAlerts = alerts.filter((a) => {
    const d = new Date(a.triggered_at || a.received_at);
    return d >= weekStart;
  }).length;

  const uniqueToday = new Set(
    alerts
      .filter(
        (a) =>
          new Date(a.triggered_at || a.received_at).toLocaleDateString("en-CA") === todayKey
      )
      .map((a) => a.ticker.toUpperCase())
  ).size;

  const types = [...new Set(alerts.map((a) => a.alert_type).filter(Boolean))] as string[];
  const exchanges = [...new Set(alerts.map((a) => a.exchange).filter(Boolean))] as string[];

  const formatDate = (value: string | null) =>
    new Date(value || "").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatTime = (value: string | null) =>
    new Date(value || "").toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const buildTradingViewUrl = (ticker: string, ex?: string | null) => {
    const symbol = ex ? `${ex}:${ticker}` : ticker;
    return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
  };

  const messageText = (message: string | null) => {
    if (!message) return "No message";
    return message === "{{alert_message}}" ? "TradingView Alert" : message;
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Zap size={17} strokeWidth={2.5} /></div>
          <div>
            <div className="brand-title">TradingView Alerts</div>
            <div className="brand-subtitle">Monk Alpha Capital</div>
          </div>
        </div>

        <div className="top-actions">
          <div className={`status ${online ? "live" : "offline"}`}>
            <span className="status-dot" />
            {online ? "LIVE" : "OFFLINE"}
          </div>
          <span className="last-update">
            {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Connecting..."}
          </span>
          <button className="icon-btn" onClick={() => loadAlerts(true)} title="Refresh">
            <RefreshCw size={17} className={refreshing ? "spin" : ""} />
          </button>
        </div>
      </header>

      <main className="container">
        <section className="intro">
          <div>
            <h1>Alert Dashboard</h1>
            <p>Monitor, search and review every TradingView alert in one place.</p>
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
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticker or alert..."
            />
            {search && <button onClick={() => setSearch("")}><X size={15} /></button>}
          </div>

          <div className="toolbar-actions">
            <button className="filter-toggle" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={16} /> Filters
              <ChevronDown size={15} className={showFilters ? "rotate" : ""} />
            </button>
            <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
              <option value="all">All Dates</option>
              <option value={todayKey}>Today</option>
              {dates.filter((d) => d !== todayKey).slice(0, 30).map((d) => (
                <option key={d} value={d}>{formatDate(d + "T12:00:00")}</option>
              ))}
            </select>
          </div>
        </section>

        {showFilters && (
          <section className="filters">
            <label>
              Alert Type
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="all">All Types</option>
                {types.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label>
              Exchange
              <select value={exchange} onChange={(e) => setExchange(e.target.value)}>
                <option value="all">All Exchanges</option>
                {exchanges.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <button className="clear-btn" onClick={() => { setSelectedDate("all"); setType("all"); setExchange("all"); setSearch(""); }}>
              Clear filters
            </button>
          </section>
        )}

        <div className="feed-header">
          <div>
            <span className="section-title">
              {selectedDate === "all" ? "Latest Alerts" : formatDate(selectedDate + "T12:00:00")}
            </span>
            <span className="result-count">{filtered.length} alerts</span>
          </div>
          <span className="polling"><span /> Auto-refresh {POLL_MS / 1000}s</span>
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
            filtered.map((alert) => (
              <article className="alert-row" key={alert.id} onClick={() => setSelectedAlert(alert)}>
                <div className="alert-time">
                  <strong>{formatTime(alert.triggered_at || alert.received_at)}</strong>
                  <span>{formatDate(alert.triggered_at || alert.received_at)}</span>
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
                  </div>
                  <p>{messageText(alert.message)}</p>
                </div>
                <div className="row-actions">
                  <button
                    className="tv-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(buildTradingViewUrl(alert.ticker, alert.exchange), "_blank", "noopener,noreferrer");
                    }}
                  >
                    Open TradingView <ExternalLink size={14} />
                  </button>
                </div>
              </article>
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
              </div>
              <button className="icon-btn" onClick={() => setSelectedAlert(null)}><X size={18} /></button>
            </div>
            <div className="detail-grid">
              <Detail label="Price" value={selectedAlert.price == null ? "—" : `$${selectedAlert.price}`} />
              <Detail label="Exchange" value={selectedAlert.exchange || "—"} />
              <Detail label="Timeframe" value={selectedAlert.timeframe ? `${selectedAlert.timeframe} min` : "—"} />
              <Detail label="Type" value={selectedAlert.alert_type || "TradingView Alert"} />
              <Detail label="Triggered" value={`${formatDate(selectedAlert.triggered_at)} · ${formatTime(selectedAlert.triggered_at)}`} />
              <Detail label="Received" value={`${formatDate(selectedAlert.received_at)} · ${formatTime(selectedAlert.received_at)}`} />
            </div>
            <div className="message-block">
              <span className="eyebrow">Message</span>
              <p>{selectedAlert.message || "No message"}</p>
            </div>
            {selectedAlert.raw_payload && (
              <details className="raw">
                <summary>Raw payload</summary>
                <pre>{(() => { try { return JSON.stringify(JSON.parse(selectedAlert.raw_payload!), null, 2); } catch { return selectedAlert.raw_payload; } })()}</pre>
              </details>
            )}
            <button
              className="primary-btn"
              onClick={() => window.open(buildTradingViewUrl(selectedAlert.ticker, selectedAlert.exchange), "_blank", "noopener,noreferrer")}
            >
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
