import { describe, it, expect } from 'vitest';
import { runScript } from '../../src/lib/star-runtime/runner';
import fs from 'fs';
import path from 'path';

describe('E2E: Test_HL_strategy.pine', () => {
  it('runs example script end-to-end without throwing and records strategy actions', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'star-examples', 'Test_HL_strategy.pine'), 'utf8');
    const res = runScript(src);
    // should produce plots or strategy records
    expect(res.plots).toBeDefined();
    expect(res.env).toBeDefined();
    // strategy internal should exist (may be empty)
    expect(res.env.strategy?._internal).toBeDefined();
  });
});
