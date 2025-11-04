import { describe, it, expect } from 'vitest';
import { runScript } from '../../src/lib/star-runtime/runner';
import fs from 'fs';
import path from 'path';

describe('star-runtime runner', () => {
  it('runs ma_simple example without crashing and captures plot', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'star-examples', 'ma_simple.pine'), 'utf8');
    const res = runScript(src);
    expect(res.plots.length).toBeGreaterThanOrEqual(1);
    // SMA assignment should exist
    expect(res.env).toHaveProperty('sma_v');
  });

  it('runs rsi example and sets rsi_v', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'star-examples', 'rsi_example.pine'), 'utf8');
    const res = runScript(src);
    expect(res.env).toHaveProperty('rsi_v');
    expect(res.plots.length).toBeGreaterThanOrEqual(1);
  });
});
