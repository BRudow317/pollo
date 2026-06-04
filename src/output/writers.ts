/**
 * writers.ts
 *
 * Output-format writers for query results. Takes an AsyncIterable<Row> (the
 * common record-stream shape used by every DataSource) and serializes it to
 * JSON, NDJSON, CSV, TSV, Parquet, Arrow IPC, or a Polars-style printed table.
 *
 * Binary formats (parquet, arrow) must go to a file; everything else goes to
 * stdout by default or to a file when --file/-f is supplied.
 */
import pl from 'nodejs-polars'
import { writeFile } from 'node:fs/promises'

import type { Row } from '../models.js'

export type OutputFormat = 'json' | 'ndjson' | 'csv' | 'tsv' | 'parquet' | 'arrow' | 'dataframe'

export const OUTPUT_FORMATS: readonly OutputFormat[] = [
  'json',
  'ndjson',
  'csv',
  'tsv',
  'parquet',
  'arrow',
  'dataframe',
]

export function isOutputFormat(value: string): value is OutputFormat {
  return (OUTPUT_FORMATS as readonly string[]).includes(value)
}

const BINARY_FORMATS: ReadonlySet<OutputFormat> = new Set(['parquet', 'arrow'])

export interface WriteOptions {
  format: OutputFormat
  path?: string | null
}

/**
 * Drain a row stream and serialize it. Returns the number of rows written so
 * commands can report a summary.
 */
export async function writeRecords(
  rows: AsyncIterable<Row>,
  opts: WriteOptions,
): Promise<number> {
  const { format } = opts
  const path = opts.path ?? null

  if (BINARY_FORMATS.has(format) && !path) {
    throw new Error(`Format '${format}' is binary; provide --file/-f <path>.`)
  }

  const collected: Row[] = []
  for await (const row of rows) {
    collected.push(row)
  }

  if (format === 'dataframe') {
    const df = collected.length ? pl.DataFrame(collected) : pl.DataFrame({})
    process.stdout.write(df.toString() + '\n')
    return collected.length
  }

  if (format === 'json') {
    const text = JSON.stringify(collected, jsonReplacer, 2)
    await emit(text + '\n', path)
    return collected.length
  }

  if (format === 'ndjson') {
    const text = collected.map((r) => JSON.stringify(r, jsonReplacer)).join('\n')
    await emit(collected.length ? text + '\n' : '', path)
    return collected.length
  }

  if (collected.length === 0) {
    // Polars cannot build a DataFrame from zero rows + zero columns for csv/tsv
    // or the binary formats; emit an empty file/stdout instead.
    await emit('', path)
    return 0
  }

  const df = pl.DataFrame(collected)

  if (format === 'csv') {
    if (path) df.writeCSV(path)
    else process.stdout.write(df.writeCSV().toString())
    return collected.length
  }

  if (format === 'tsv') {
    const tsvOpts = { separator: '\t' }
    if (path) df.writeCSV(path, tsvOpts)
    else process.stdout.write(df.writeCSV(tsvOpts).toString())
    return collected.length
  }

  if (format === 'parquet') {
    df.writeParquet(path as string)
    return collected.length
  }

  if (format === 'arrow') {
    df.writeIPC(path as string)
    return collected.length
  }

  throw new Error(`Unhandled output format: ${String(format)}`)
}

async function emit(text: string, path: string | null): Promise<void> {
  if (path) {
    await writeFile(path, text, 'utf-8')
  } else {
    process.stdout.write(text)
  }
}

/** JSON.stringify replacer that handles types JSON can't natively encode. */
function jsonReplacer(_key: string, value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (Buffer.isBuffer(value)) return value.toString('base64')
  if (value instanceof Uint8Array) return Buffer.from(value).toString('base64')
  return value
}
