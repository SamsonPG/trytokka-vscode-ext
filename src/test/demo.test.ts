import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { demoSpendData, isDemoToken, DEMO_TOKEN } from '../demo'

describe('demoSpendData', () => {
  it('returns finite paced costs', () => {
    const now = new Date(2026, 6, 15, 12)
    const d = demoSpendData(now)
    assert.ok(d.monthCost > 0)
    assert.ok(Number.isFinite(d.todayCost))
    assert.equal(d.topProvider, 'OpenAI')
    assert.ok(['safe', 'warning', 'critical'].includes(d.alertStatus))
    assert.equal(typeof d.lastSuccessfulSyncAt, 'string')
  })
})

describe('isDemoToken', () => {
  it('matches sentinel only', () => {
    assert.equal(isDemoToken(DEMO_TOKEN), true)
    assert.equal(isDemoToken('abc'), false)
    assert.equal(isDemoToken(undefined), false)
  })
})
