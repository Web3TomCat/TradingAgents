# TradingAgents Research Dashboard

Professional dark-mode equity research dashboard for TradingAgents `*_state.json` outputs.

## Run

```bash
cd web
npm install
npm run dev
```

The app reads JSON reports from the repository-level `outputs/` directory:

```text
outputs/XXX_YYYY-MM-DD_YYYYMMDD_HHMMSS_state.json
```

It also supports browser-side local JSON loading from the header.

## Architecture

- `app/` - Next.js 15 App Router entry points and global styling.
- `components/dashboard/` - institutional research dashboard sections, charts, actions and local loader.
- `components/ui/` - shadcn-style primitives used by the dashboard.
- `lib/parsers/` - robust Markdown and semi-structured report extractors.
- `lib/server/reports.ts` - server-side discovery and parsing of `outputs/*_state.json`.
- `lib/types.ts` - strict TypeScript contracts for raw and parsed report data.
- `data/mock-tradingagents-state.json` - compact example input.
