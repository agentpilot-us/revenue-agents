import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStradexDemoNote,
  refreshStradexDemoNoteLine,
} from './seller-profile';

describe('refreshStradexDemoNoteLine', () => {
  it('returns canonical first line when demoNote is empty', () => {
    assert.equal(
      refreshStradexDemoNoteLine(null, 'Acme'),
      buildStradexDemoNote('Acme')
    );
  });

  it('replaces only the first line when it matches Stradex template; keeps rest', () => {
    const base = `${buildStradexDemoNote('OldCo')}\nManual review: thin enrichment.`;
    const next = refreshStradexDemoNoteLine(base, 'NewCo');
    assert.ok(next.startsWith(buildStradexDemoNote('NewCo')));
    assert.ok(next.includes('Manual review: thin enrichment.'));
    assert.equal(next.split('\n').length, 2);
  });

  it('matches legacy first line without "selling:" segment', () => {
    const legacy = 'Stradex free brief — web intake (service user)\nExtra';
    const next = refreshStradexDemoNoteLine(legacy, 'Seller Inc');
    assert.ok(next.startsWith(buildStradexDemoNote('Seller Inc')));
    assert.ok(next.endsWith('Extra'));
  });

  it('leaves demoNote unchanged when first line was manually rewritten', () => {
    const custom = 'Internal: custom ops label — do not auto-edit\nSecond line';
    assert.equal(refreshStradexDemoNoteLine(custom, 'IgnoredCo'), custom);
  });

  it('does not prepend when first line is not a Stradex template', () => {
    const onlySecond = '\nStradex free brief on line two';
    assert.equal(refreshStradexDemoNoteLine(onlySecond, 'Co'), onlySecond);
  });
});
