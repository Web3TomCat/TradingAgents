# TradingAgents Research Dashboard

Professional dark-mode equity research dashboard for TradingAgents `*_state.json` outputs.

## Run

```bash
cd web
npm install
npm run dev
```

The app first reads bundled JSON reports from `web/data/reports/`, which is suitable for Vercel deployments:

```text
web/data/reports/XXX_YYYY-MM-DD_YYYYMMDD_HHMMSS_state.json
```

If that directory is missing locally, it falls back to the repository-level `outputs/` directory.

It also supports browser-side local JSON loading from the header.

## Architecture

- `app/` - Next.js 15 App Router entry points and global styling.
- `components/dashboard/` - institutional research dashboard sections, charts, actions and local loader.
- `components/ui/` - shadcn-style primitives used by the dashboard.
- `lib/parsers/` - robust Markdown and semi-structured report extractors.
- `lib/server/reports.ts` - server-side discovery and parsing of bundled or local `*_state.json` files.
- `lib/types.ts` - strict TypeScript contracts for raw and parsed report data.
- `data/mock-tradingagents-state.json` - compact example input.
