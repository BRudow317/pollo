/**
 * commands/ora.ts
 *
 * `mars ora <env> -q "<sql>" [-o format] [-f outfile]` -- run a SQL statement
 * against an Oracle environment and emit the result rows in the chosen format.
 */
import { Command, Option } from 'commander'

import { loadEnv } from '../env.js'
import { Oracle } from '../oracle/Oracle.js'
import {
  type OutputFormat,
  OUTPUT_FORMATS,
  writeRecords,
} from '../output/writers.js'

interface OraOptions {
  query: string
  envFile?: string
  namespace?: string
  file?: string
  output: OutputFormat
}

export function buildOraCommand(): Command {
  return new Command('ora')
    .description('Run a SQL query against an Oracle environment')
    .argument('<env>', 'Oracle environment key (e.g. QBL, DWH, HOMELAB)')
    .requiredOption('-q, --query <sql>', 'SQL statement to execute')
    .option('-e, --env-file <path>', 'path to .env file with credentials (overrides SCIPIO_SECRETS_ENV)')
    .option('-n, --namespace <schema>', 'Oracle schema (defaults to the env user)')
    .option('-f, --file <path>', 'output file path; omit for stdout')
    .addOption(
      new Option('-o, --output <format>', 'output format')
        .choices([...OUTPUT_FORMATS])
        .default('json'),
    )
    .action(async (envKey: string, opts: OraOptions) => {
      loadEnv(opts.envFile, envKey)

      const ora = new Oracle(envKey, opts.namespace ?? null)
      try {
        const records = await ora.query(opts.query)
        const n = await writeRecords(records.data, {
          format: opts.output,
          path: opts.file ?? null,
        })
        if (opts.file) {
          console.error(`wrote ${n} row(s) to ${opts.file}`)
        }
      } finally {
        await ora.client.close()
      }
    })
}
