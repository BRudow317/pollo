# mars

A small, reusable CLI for querying and moving data between **Salesforce orgs**
and **Oracle databases**. Built on the same `DataSource` contract used by the
underlying Python project (`charon`): describe a schema, stream records, load
them -- in any direction.

System-agnostic where it can be -- new backends plug into the `DataSource`
interface without touching command code.

---

## Install

From a published location (locally for now, GitHub later):

```shell
npm install -g github:rudow/mars        # once the repo lives on GitHub
# or, while iterating locally:
npm install -g .
```

The `prepare` script builds `dist/` automatically on install, so cloning and
installing the repo is enough -- no need to commit `dist/`.

Local workaround (no global install):

```shell
npm run mars -- ora DWH -q "select * from sf_account"
# or (no `--`, no flags):
npm run mars ora DWH "select * from sf_account"
```

Note: `ora` expects the environment as a positional value (`DWH` above).
`-e` means env-file path, not environment key.

---

## Requirements

- Node 20+ (uses global `fetch`; tested on Node 24)
- Oracle: the official `oracledb` driver in **thin mode** -- no Instant Client
- Credentials in a `.env` file (default `C:\Users\rmedi\stage\rundeck-scripts\.env`,
  override with `SCIPIO_SECRETS_ENV` or per-invocation `-e <path>`)

```shell
npm install
```

---

## Configuration

`mars` reads connection settings from a `key=value` secrets file. Variables are
keyed by environment, so one file can serve many environments:

```shell
ORACLE_DWH_USER=myuser
ORACLE_DWH_PASS=examplepassword123
ORACLE_DWH_HOST=localhost
ORACLE_DWH_PORT=1521
ORACLE_DWH_SERVICE=exampledbservice

SF_TRAIL_BASE_URL=https://your-org.my.salesforce.com
SF_TRAIL_CONSUMER_KEY=exampleconsumerkey123
SF_TRAIL_CONSUMER_SECRET=examplesecretkey123
```

---

## Commands

### Query Oracle

```shell
mars ora <env> -q "<sql>" [-e <env-file>] [-o <format>] [-f <out-file>] [-n <schema>]
```

Example -- print results as JSON to stdout:

```shell
mars ora QBL -q "select * from qbl_users where rownum < 10"
```

Write to a Parquet file:

```shell
mars ora QBL -q "select * from qbl_users" -o parquet -f users.parquet
```

### Query Salesforce

```shell
mars sf <env> -q "<soql>" [-e <env-file>] [-o <format>] [-f <out-file>]
```

```shell
mars sf TRAIL -q "SELECT Id, Name FROM Account LIMIT 10" -o csv
```

### Migrate between systems

```shell
mars migrate \
  --source-system salesforce --source-environment TRAIL --source-namespace TRAIL \
  --target-system oracle     --target-environment DWH   --target-namespace DWH \
  --action upsert --tables Contact Account
```

Flags mirror the original `polo`/`charon` migration tool:

| Flag                                            | Required | Notes                                              |
| ----------------------------------------------- | -------- | -------------------------------------------------- |
| `--source-system` / `--target-system`           | yes      | `salesforce` or `oracle`                           |
| `--source-environment` / `--target-environment` | yes      | env key (e.g. `TRAIL`, `DWH`)                      |
| `--source-namespace` / `--target-namespace`     | no       | schema / namespace                                 |
| `--action`                                      | no       | `reset` (default), `insert`, `upsert`, `update`    |
| `--external-id-field`                           | no       | external id for SF upsert (defaults to `Id`)       |
| `--tables`                                      | no       | space-separated names, or `*` for the whole schema |

---

## Output formats (`-o`)

| Format           | Notes                                            |
| ---------------- | ------------------------------------------------ |
| `json` (default) | Pretty-printed JSON array. stdout or `-f <path>` |
| `ndjson`         | One JSON object per line. stdout or `-f`         |
| `csv`            | Comma-separated, header row. stdout or `-f`      |
| `tsv`            | Tab-separated, header row. stdout or `-f`        |
| `parquet`        | Apache Parquet via Polars. **Requires `-f`**     |
| `arrow`          | Apache Arrow IPC via Polars. **Requires `-f`**   |
| `dataframe`      | Polars `df.toString()` pretty table. stdout only |

---

## Scripts

| Script                  | Purpose                                             |
| ----------------------- | --------------------------------------------------- |
| `npm run dev -- <args>` | run the CLI from TypeScript via `tsx`               |
| `npm run build`         | compile `src` → `dist`                              |
| `npm start -- <args>`   | run the compiled CLI                                |
| `npm test`              | live connection health checks (Oracle + Salesforce) |
| `npm run typecheck`     | type-check `src` and `tests`                        |
| `npm run lint`          | lint                                                |

---

## Tests

`npm test` runs `tests/connection.test.ts`, verifying `isHealthy()` against the
Oracle environments `QBL` / `DWH` / `HOMELAB` and the Salesforce `TRAIL` org.
Requires real credentials and network access.
