/**
 * commands/sf.ts
 *
 * `mars sf <env> -q "<soql>" [-o format] [-f outfile]` -- run a SOQL query
 * against a Salesforce org and emit the result rows in the chosen format.
 */
import { Command, Option } from "commander";

import { loadEnv } from "../env.js";
import { Salesforce } from "../sf/Salesforce.js";
import {
  type OutputFormat,
  OUTPUT_FORMATS,
  writeRecords,
} from "../output/writers.js";

interface SfOptions {
  query: string;
  envFile?: string;
  namespace?: string;
  sfNamespace?: string;
  file?: string;
  output: OutputFormat;
}

export function buildSfCommand(): Command {
  return new Command("sf")
    .description("Run a SOQL query against a Salesforce environment")
    .argument("[env]", "Salesforce environment key (e.g. TRAIL)")
    .requiredOption("-q, --query <soql>", "SOQL statement to execute")
    .option(
      "-e, --env-file <path>",
      "path to .env file with credentials (overrides SCIPIO_SECRETS_ENV)",
    )
    .option(
      "-n, --namespace <env>",
      "Salesforce environment key (alternative to positional <env>)",
    )
    .option("-s, --sf-namespace <ns>", "Salesforce namespace")
    .option("-f, --file <path>", "output file path; omit for stdout")
    .addOption(
      new Option("-o, --output <format>", "output format")
        .choices([...OUTPUT_FORMATS])
        .default("json"),
    )
    .addHelpText(
      "after",
      `
Examples:
  mars sf TRAIL -q "select Id, Subject from Case"
  mars sf TRAIL -q "select * from Case"
  npm run mars -- sf TRAIL -q "select Id, Subject from Case" -o csv -f "./.test/case.csv"

Notes:
  - Provide env with <env> or -n/--namespace.
  - -e/--env-file expects a file path, not an environment key.
  - "select * from <Object>" expands to every queryable field via describe and
    routes through REST or Bulk 2.0 automatically based on width and row count.
`,
    )
    .action(async (envArg: string | undefined, opts: SfOptions) => {
      const envKey = opts.namespace ?? envArg;
      if (!envKey) {
        throw new Error(
          "Missing environment. Provide <env> or -n/--namespace <env>.",
        );
      }

      loadEnv(opts.envFile, envKey);

      const sf = new Salesforce(envKey, opts.sfNamespace ?? null);
      const records = await sf.query(opts.query);
      const n = await writeRecords(records.data, {
        format: opts.output,
        path: opts.file ?? null,
      });
      if (opts.file) {
        console.error(`wrote ${n} row(s) to ${opts.file}`);
      }
    });
}
