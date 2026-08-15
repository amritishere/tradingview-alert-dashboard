# Monk Alpha Capital — TradingView Alert Dashboard

Lightweight production dashboard for Monk Alpha Capital's TradingView alerts.

## Production endpoints

- Dashboard: https://monkalphacapital.com
- Existing alert API: https://api.monkalphacapital.com
- Alerts API: https://api.monkalphacapital.com/alerts
- Health check: https://api.monkalphacapital.com/health
- TradingView webhook receiver: https://tradingview-webhook.amrit-rj99.workers.dev

The frontend does **not** recreate or modify the existing webhook Worker or D1 database. It reads the existing `/alerts` API and refreshes every 5 seconds.

## TradingView alert setup

For the **Daily HL Match - Data + Alerts (0.01, 60)** Pine indicator, the alert should use:

- Condition: `Daily HL Match - Data + Alerts (0.01, 60)`
- Trigger: **Any alert() function call**
- Webhook URL: `https://tradingview-webhook.amrit-rj99.workers.dev`

The dashboard recognizes the messages produced by the script, including:

- `HIGH MATCH | TICKER | Current High: ... | Previous High: ... | Matched Date: ...`
- `LOW MATCH | TICKER | Current Low: ... | Previous Low: ... | Matched Date: ...`

No change is required to the Pine Script just to display these messages. The dashboard parses the `HIGH MATCH` / `LOW MATCH` payload and presents the current value, previous matched value, and matched date as structured information.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The Vite production output is written to `dist/`.

## Cloudflare

The repository now contains an explicit `wrangler.jsonc` configuration for the Vite SPA. The configuration serves `dist/` as static assets and enables SPA fallback routing.

The production custom domain is already associated with the Cloudflare Worker:

`monkalphacapital.com`

## Dashboard behavior

- Live/offline API status
- 5-second automatic refresh
- Manual refresh
- Optional alert sound
- Search by ticker, message, exchange or timeframe
- Date, alert-type and exchange filters
- Daily alert grouping
- High Match / Low Match recognition
- Alert detail drawer with raw payload
- Direct **Open TradingView** chart button
- New-alert highlighting
- India Standard Time (IST) display
- Monk Alpha Capital branding and favicon
