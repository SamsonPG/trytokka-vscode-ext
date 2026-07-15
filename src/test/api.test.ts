import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { looksLikeToken, parseSpendPayload } from '../api'

describe('looksLikeToken', () => {
  it('accepts 64-char hex widget tokens', () => {
    assert.equal(looksLikeToken('a'.repeat(64)), true)
    assert.equal(looksLikeToken('0123456789abcdef'.repeat(4)), true)
  })

  it('accepts prefixed tokens', () => {
    assert.equal(looksLikeToken('tk_live_abcdefghijklmnopqrstuvwxyz'), true)
  })

  it('rejects short, spaced, or empty values', () => {
    assert.equal(looksLikeToken(''), false)
    assert.equal(looksLikeToken('short'), false)
    assert.equal(looksLikeToken('token with spaces...............'), false)
  })
})

describe('parseSpendPayload', () => {
  it('parses a valid WidgetSummary shape', () => {
    const data = parseSpendPayload({
      todayCost: 1.25,
      monthCost: 40,
      totalCost: 55,
      topProvider: 'openai',
      alertStatus: 'warning',
      lastUpdated: '2026-07-15T10:00:00.000Z',
    })
    assert.ok(data)
    assert.equal(data!.monthCost, 40)
    assert.equal(data!.alertStatus, 'warning')
    assert.equal(data!.topProvider, 'openai')
  })

  it('coerces junk numbers and unknown alertStatus', () => {
    const data = parseSpendPayload({
      todayCost: 'nope',
      monthCost: null,
      alertStatus: 'explode',
      topProvider: 12,
    })
    assert.ok(data)
    assert.equal(data!.todayCost, 0)
    assert.equal(data!.monthCost, 0)
    assert.equal(data!.alertStatus, 'safe')
    assert.equal(data!.topProvider, null)
    assert.ok(data!.lastUpdated)
  })

  it('returns null for non-objects', () => {
    assert.equal(parseSpendPayload(null), null)
    assert.equal(parseSpendPayload('x'), null)
  })
})
