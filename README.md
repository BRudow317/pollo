# polo

A command-line tool for migrating data between **Salesforce** and **Oracle**.

It wraps both systems behind a single `DataSource` contract: describe a schema,
describe/align a table, stream records, and load them — in any direction
(sf→oracle, oracle→sf, oracle→oracle, sf→sf).

This is the CLI-only descendant of the `scipio` project: the same migration
engine with the React/Vite frontend stripped out. There is no Vite or Vitest in
the tree — TypeScript runs directly via `tsx`, and tests use Node's built-in
test runner.

---

## Requirements

- Node 20+ (uses global `fetch`; developed on Node 24)
- Oracle: the official `oracledb` driver in **thin mode** — no Instant Client needed
- Credentials in `Q:\.secrets\.env` (override with `SCIPIO_SECRETS_ENV`)

```shell
npm install
```

---

## Configuration

`polo` reads connection settings from a `key=value` secrets file (default
`Q:\.secrets\.env`). Per-environment variables:

```shell
ORACLE_DWH_USER=myuser
ORACLE_DWH_PASS=examplepassword123
ORACLE_DWH_HOST=localhost
ORACLE_DWH_PORT=1521
ORACLE_DWH_SERVICE=exampledbservice

SF_TRAIL_BASE_URL=https://your-org.my.salesforce.com
SF_TRAIL_CONSUMER_KEY=exampleconsumerkey123
SF_TRAIL_CONSUMER_SECRET=examplesecretkey123
SF_TRAIL_API_VERSION=66.0
```

---

## Usage

```powershell
npm run migrate -- `
  --source-system salesforce --source-environment TRAIL --source-namespace TRAIL `
  --target-system oracle     --target-environment DWH   --target-namespace DWH `
  --action upsert --tables Contact Account
```

Flags:

| Flag | Required | Notes |
|---|---|---|
| `--source-system` / `--target-system` | yes | `salesforce` or `oracle` |
| `--source-environment` / `--target-environment` | yes | env key (e.g. `TRAIL`, `DWH`) |
| `--source-namespace` / `--target-namespace` | no | schema / namespace |
| `--action` | no | `reset` (default), `insert`, `upsert`, `update` |
| `--external-id-field` | no | external id for Salesforce upsert (defaults to `Id`) |
| `--tables` | no | space-separated names, or `*` for the whole schema (default `*`) |

After `npm run build`, the compiled `dist/cli.js` is exposed as the `polo` bin.

---

## Scripts

| Script | Purpose |
|---|---|
| `npm run migrate -- <flags>` | run a migration directly from TypeScript (tsx) |
| `npm test` | live connection health checks (Oracle + Salesforce) |
| `npm run typecheck` | type-check `src` and `tests` |
| `npm run lint` | lint |
| `npm run build` | compile `src` → `dist` |

---

## Tests

`npm test` runs `tests/connection.test.ts`, which verifies `isHealthy()` against
the Oracle environments `QBL`/`DWH`/`HOMELAB` and the Salesforce `TRAIL` org.
Requires real credentials and network access.
