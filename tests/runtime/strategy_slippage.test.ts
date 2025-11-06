import { describe, it, expect } from 'vitest';
import { runScript } from '../../src/lib/star-runtime/runner';

describe('strategy slippage & partial fills', () => {
  it('applies slippage to buy orders and affects pnl', () => {
    const srcNoSlip = `strategy.entry("long1", 10)`;
  // use named-arg form supported by parser: slippage=0.01
  const srcSlip = `strategy.order("long2", "buy", 10, slippage=0.01)`;
    const resNoSlip = runScript(srcNoSlip);
    const resSlip = runScript(srcSlip);
    // both should have at least one trade
    expect(resNoSlip.env.strategy._internal.trades.length).toBeGreaterThanOrEqual(1);
    expect(resSlip.env.strategy._internal.trades.length).toBeGreaterThanOrEqual(1);
    // price used for slipped trade should differ from non-slipped (adj price)
    const pNo = resNoSlip.env.strategy._internal.trades[0].price;
    const pSlip = resSlip.env.strategy._internal.trades[0].price;
    expect(pSlip).not.toBe(pNo);
  });

  it('supports partial fills via fillPercent', () => {
  // use named-arg form supported by parser: fillPercent=0.5
  const src = `strategy.order("p1", "buy", 10, fillPercent=0.5)`;
    const res = runScript(src);
    // filled quantity should be <= requested
    const ord = res.env.strategy._internal.orders[0];
    expect(ord.qty).toBeLessThanOrEqual(ord.requestedQty);
    expect(ord.qty).toBe(Math.floor(ord.requestedQty * 0.5));
  });
});
