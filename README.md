# TradingView Alert Dashboard

Frontend-only Cloudflare-ready dashboard for the existing Monk Alpha Capital TradingView API.

## Existing production API

- API base: https://api.monkalphacapital.com
- Alerts: https://api.monkalphacapital.com/alerts
- Ticker filter: https://api.monkalphacapital.com/alerts?ticker=TSLA
- Health: https://api.monkalphacapital.com/health

This project DOES NOT recreate or modify the existing Worker or D1 database.

## Run locally

```bash
npm install
npm run dev
```

Open the local Vite URL shown by the terminal.

## Build

```bash
npm run build
```

The production files are created in `dist/`.

## Cloudflare deployment

Recommended: deploy the `dist/` folder as a Cloudflare Pages project.

1. Push this project to GitHub.
2. Cloudflare Dashboard -> Workers & Pages -> Create application.
3. Choose Pages / Connect to Git.
4. Select this repository.
5. Build command: `npm run build`
6. Build output directory: `dist`
7. Deploy.

Then add the custom domain `app.monkalphacapital.com` from the Pages project's Custom Domains section.

No D1 binding is required for the frontend because the existing Worker API remains the source of truth.

## Important

The frontend polls the existing `/alerts` API every 5 seconds. It does not modify the webhook, D1, or existing Worker.

The current API may return `message: "{{alert_message}}"`. The dashboard displays that placeholder as "TradingView Alert" in the compact feed but preserves the original value in the alert detail view.

## Production checklist

- Confirm https://api.monkalphacapital.com/health returns success.
- Confirm https://api.monkalphacapital.com/alerts returns alerts.
- Build with `npm run build`.
- Deploy the `dist/` output to Cloudflare.
- Add `app.monkalphacapital.com`.
- Open the dashboard and confirm the real TSLA records appear.
- Click Open TradingView and verify the chart URL.
