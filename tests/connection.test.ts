/**
 * connection.test.ts -- live connection health checks via isHealthy().
 *
 * Uses Node's built-in test runner (node:test) so polo carries no Vite/Vitest.
 * Run with: npm test  (node --import tsx --test).
 *
 * Each test requires real credentials in Q:\.secrets\.env (loaded below) and
 * network access to the target system.
 */
import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { loadEnv } from '../src/env.js'
import { Oracle } from '../src/oracle/Oracle.js'
import { Salesforce } from '../src/sf/Salesforce.js'

// Inject the secrets .env before any client is constructed.
loadEnv()

// (env, namespace) probes. HOME has only a filesystem path var, so it is not a
// connectable env.
const ORACLE_ENVIRONMENTS = ['QBL', 'DWH', 'HOMELAB']
const SALESFORCE_ENVIRONMENTS = ['TRAIL']

describe('Oracle connectivity', () => {
  let openClient: { close(): Promise<void> } | null = null
  after(async () => {
    if (openClient) await openClient.close()
    openClient = null
  })

  for (const env of ORACLE_ENVIRONMENTS) {
    it(`Oracle ${env} is healthy`, async () => {
      const ora = new Oracle(env, env)
      openClient = ora.client
      const healthy = await ora.isHealthy()
      assert.equal(healthy, true)
      await ora.client.close()
      openClient = null
    })
  }
})

describe('Salesforce connectivity', () => {
  for (const env of SALESFORCE_ENVIRONMENTS) {
    it(`Salesforce ${env} is healthy`, async () => {
      const sf = new Salesforce(env, env)
      const healthy = await sf.isHealthy()
      assert.equal(healthy, true)
    })
  }
})
