/**
 * commands/migrate.ts
 *
 * `mars migrate` -- cross-system data migration. This is the original pollo
 * functionality lifted under a Commander subcommand; same flags, same flow.
 */
import { Command, Option } from 'commander'

import { loadEnv } from '../env.js'
import { type SeedingArgs, seeding } from '../seeding.js'
import { toSystem } from '../models.js'

const ACTIONS = ['reset', 'insert', 'upsert', 'update'] as const

export function buildMigrateCommand(): Command {
  return new Command('migrate')
    .description('Migrate tables/objects between Salesforce and Oracle')
    .requiredOption('--source-system <system>', 'source system: salesforce | oracle')
    .requiredOption('--source-environment <env>', 'source environment key (e.g. TRAIL, DWH)')
    .option('--source-namespace <ns>', 'source namespace / schema')
    .requiredOption('--target-system <system>', 'target system: salesforce | oracle')
    .requiredOption('--target-environment <env>', 'target environment key')
    .option('--target-namespace <ns>', 'target namespace / schema')
    .addOption(
      new Option('--action <action>', 'load action').choices([...ACTIONS]).default('reset'),
    )
    .option('--external-id-field <field>', 'Salesforce upsert external id (defaults to Id)')
    .option('--tables <names...>', 'table names, or * for the whole schema', ['*'])
    .option('-e, --env-file <path>', 'path to .env file with credentials (overrides SCIPIO_SECRETS_ENV)')
    .action(async (opts: MigrateOptions) => {
      loadEnv(opts.envFile, opts.sourceEnvironment)
      const args: SeedingArgs = {
        sourceSystem: toSystem(opts.sourceSystem),
        sourceEnvironment: opts.sourceEnvironment,
        sourceNamespace: opts.sourceNamespace ?? null,
        targetSystem: toSystem(opts.targetSystem),
        targetEnvironment: opts.targetEnvironment,
        targetNamespace: opts.targetNamespace ?? null,
        tables: opts.tables ?? ['*'],
        action: opts.action,
        externalIdField: opts.externalIdField ?? null,
      }
      process.exitCode = await seeding(args)
    })
}

interface MigrateOptions {
  sourceSystem: string
  sourceEnvironment: string
  sourceNamespace?: string
  targetSystem: string
  targetEnvironment: string
  targetNamespace?: string
  action: string
  externalIdField?: string
  tables?: string[]
  envFile?: string
}
