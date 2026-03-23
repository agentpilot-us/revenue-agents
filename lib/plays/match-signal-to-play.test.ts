import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { conditionsMatch } from './signal-mapping-conditions';

describe('conditionsMatch (SignalPlayMapping.conditions)', () => {
  const base = { accountTier: 'enterprise', totalArr: 500_000 };

  it('returns true when conditions is null', () => {
    assert.equal(conditionsMatch(null, base), true);
  });

  it('matches single accountTier', () => {
    assert.equal(conditionsMatch({ accountTier: 'enterprise' }, base), true);
    assert.equal(conditionsMatch({ accountTier: 'smb' }, base), false);
  });

  it('matches accountTiers list', () => {
    assert.equal(conditionsMatch({ accountTiers: ['Enterprise', 'Mid-Market'] }, base), true);
    assert.equal(conditionsMatch({ accountTiers: ['smb'] }, base), false);
  });

  it('applies arr_gt and arr_lt', () => {
    assert.equal(conditionsMatch({ arr_gt: 100_000 }, base), true);
    assert.equal(conditionsMatch({ arr_gt: 1_000_000 }, base), false);
    assert.equal(conditionsMatch({ arr_lt: 1_000_000 }, base), true);
    assert.equal(conditionsMatch({ arr_lt: 100_000 }, base), false);
  });
});
