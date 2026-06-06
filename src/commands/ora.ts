/**
 * commands/ora.ts
 *
 * `mars ora <env> -q "<sql>" [-o format] [-f outfile]` -- run a SQL statement
 * against an Oracle environment and emit the result rows in the chosen format.
 */
import { Command, Option } from "commander";

import { loadEnv } from "../env.js";
import { Oracle } from "../oracle/Oracle.js";
import {
  type OutputFormat,
  OUTPUT_FORMATS,
  writeRecords,
} from "../output/writers.js";

interface OraOptions {
  query?: string;
  envFile?: string;
  namespace?: string;
  schema?: string;
  file?: string;
  output: OutputFormat;
}

export function buildOraCommand(): Command {
  return new Command("ora")
    .description("Run a SQL query against an Oracle environment")
    .argument("[env]", "Oracle environment key (e.g. QBL, DWH, HOMELAB)")
    .argument(
      "[sql]",
      "SQL statement to execute (local npm-script convenience form)",
    )
    .argument(
      "[output]",
      "Output format (json|ndjson|csv|tsv|parquet|arrow|dataframe) when using positional args",
    )
    .argument("[file]", "Output file path when using positional args")
    .option("-q, --query <sql>", "SQL statement to execute")
    .option(
      "-e, --env-file <path>",
      "path to .env file with credentials (overrides SCIPIO_SECRETS_ENV)",
    )
    .option(
      "-n, --namespace <env>",
      "Oracle environment key (alternative to positional <env>)",
    )
    .option("-s, --schema <schema>", "Oracle schema (defaults to the env user)")
    .option("-f, --file <path>", "output file path; omit for stdout")
    .addOption(
      new Option("-o, --output <format>", "output format")
        .choices([...OUTPUT_FORMATS])
        .default("json"),
    )
    .action(
      async (
        envArg: string | undefined,
        sqlArg: string | undefined,
        outputArg: string | undefined,
        fileArg: string | undefined,
        opts: OraOptions,
      ) => {
        const sql = opts.query ?? sqlArg;
        if (!sql) {
          const npmRunMars = process.env.npm_lifecycle_event === "mars";
          const npmHint = npmRunMars
            ? ' When using npm scripts, pass CLI flags after `--`: npm run mars -- ora DWH -q "select * from sf_account". Or use positional SQL: npm run mars ora DWH "select * from sf_account". Note: `-e` is env-file path, not environment key.'
            : "";
          throw new Error(
            `Missing SQL query. Use -q "<sql>" or provide it as a positional argument.${npmHint}`,
          );
        }

        const chosenOutput = outputArg ?? opts.output;
        if (!OUTPUT_FORMATS.includes(chosenOutput as OutputFormat)) {
          throw new Error(
            `Invalid output format: ${chosenOutput}. Valid values: ${OUTPUT_FORMATS.join(", ")}`,
          );
        }

        const outPath = opts.file ?? fileArg;

        const envKey = opts.namespace ?? envArg;
        if (!envKey) {
          throw new Error(
            "Missing environment. Provide <env> or -n/--namespace <env>.",
          );
        }

        loadEnv(opts.envFile, envKey);

        const ora = new Oracle(envKey, opts.schema ?? null);
        try {
          const records = await ora.query(sql);
          const n = await writeRecords(records.data, {
            format: chosenOutput as OutputFormat,
            path: outPath ?? null,
          });
          if (outPath) {
            console.error(`wrote ${n} row(s) to ${outPath}`);
          }
        } finally {
          await ora.client.close();
        }
      },
    );
}
