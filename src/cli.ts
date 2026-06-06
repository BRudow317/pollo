#!/usr/bin/env node
/**
 * cli.ts
 *
 * Root entry point for `mars`. Sets up Commander and mounts subcommands:
 *   mars ora <env> -q "..."   — Oracle SQL query
 *   mars sf  <env> -q "..."   — Salesforce SOQL query
 *   mars migrate ...          — cross-system data migration
 */
import { Command } from "commander";

import { buildMigrateCommand } from "./commands/migrate.js";
import { buildOraCommand } from "./commands/ora.js";
import { buildSfCommand } from "./commands/sf.js";

const program = new Command()
  .name("mars")
  .description(
    "CLI for querying and moving data between Salesforce orgs and Oracle databases",
  )
  .version("0.1.0");

program.addHelpText(
  "after",
  `
Examples:
  npm run mars -- ora DWH -q "select * from sf_account"
  npm run mars ora DWH "select * from sf_account" json "./.data/sf_account.json"
  npm run mars -- sf TRAIL -q "select Id, Subject from Case" -o csv -f "./.test/case.csv"

Notes:
  - For npm scripts, put CLI flags after "--".
  - Environment can be positional (<env>) or passed via -n/--namespace.
  - The -e flag is env-file path.
`,
);

program.addCommand(buildOraCommand());
program.addCommand(buildSfCommand());
program.addCommand(buildMigrateCommand());

program
  .parseAsync(process.argv)
  .then(() => {
    // process.exitCode (set by subcommands) is honored on natural exit.
  })
  .catch((err: unknown) => {
    const code = (err as { code?: string } | null)?.code;
    // Commander throws these on `--help`/version display in async paths.
    if (
      code === "commander.helpDisplayed" ||
      code === "commander.help" ||
      code === "commander.version"
    ) {
      return;
    }
    console.error(
      process.env.DEBUG
        ? err
        : `Error: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  });
