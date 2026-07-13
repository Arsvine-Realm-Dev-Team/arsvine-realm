import { describe, expect, it, vi } from 'vitest';
import { buildDocumentBootstrapScript } from '@/shared/lib/document-bootstrap';

function evaluateBootstrap(script: string, env: {
  reduceMotion?: boolean;
  saveData?: boolean;
  effectiveType?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
} = {}) {
  const attrs = new Map<string, string>();
  const html = {
    setAttribute: vi.fn((key: string, value: string) => {
      attrs.set(key, value);
    }),
    getAttribute: vi.fn((key: string) => attrs.get(key) ?? null),
    removeAttribute: vi.fn((key: string) => {
      attrs.delete(key);
    }),
  };

  const connection = {
    saveData: env.saveData ?? false,
    effectiveType: env.effectiveType ?? '4g',
  };

  const matchMedia = vi.fn(() => ({
    matches: env.reduceMotion ?? false,
  }));

  const fn = new Function('document', 'matchMedia', 'navigator', 'sessionStorage', 'localStorage', script);
  fn(
    { documentElement: html, cookie: '' },
    matchMedia,
    {
      connection,
      mozConnection: connection,
      webkitConnection: connection,
      deviceMemory: env.deviceMemory,
      hardwareConcurrency: env.hardwareConcurrency,
    },
    { getItem: () => null },
    { getItem: () => null },
  );

  return { attrs, html, matchMedia };
}

describe('buildDocumentBootstrapScript performance tier', () => {
  it('writes motion-reduced tier and matching capabilities for low network signals', () => {
    const script = buildDocumentBootstrapScript();
    const { attrs } = evaluateBootstrap(script, { effectiveType: '3g' });
    expect(attrs.get('data-performance-tier')).toBe('motion-reduced');
    expect(attrs.get('data-logo-effects')).toBe('off');
    expect(attrs.get('data-ambient-webgl')).toBe('off');
    expect(attrs.get('data-heavy-css-effects')).toBe('off');
    expect(attrs.get('data-decorative-motion')).toBe('off');
    expect(attrs.get('data-interactive-webgl')).toBe('on');
    expect(attrs.get('data-custom-cursor')).toBe('on');
  });

  it('writes logo-reduced tier for low device memory or hardware concurrency', () => {
    const script = buildDocumentBootstrapScript();
    expect(evaluateBootstrap(script, { deviceMemory: 4 }).attrs.get('data-performance-tier')).toBe('logo-reduced');
    expect(evaluateBootstrap(script, { hardwareConcurrency: 4 }).attrs.get('data-performance-tier')).toBe('logo-reduced');
  });

  it('writes minimal tier for reduced motion', () => {
    expect(evaluateBootstrap(buildDocumentBootstrapScript(), { reduceMotion: true }).attrs.get('data-performance-tier')).toBe('minimal');
  });

  it('keeps full tier when no low-power signals are present', () => {
    const script = buildDocumentBootstrapScript();
    const { attrs } = evaluateBootstrap(script);
    expect(attrs.get('data-performance-tier')).toBe('full');
    expect(attrs.get('data-logo-effects')).toBe('on');
    expect(attrs.get('data-custom-cursor')).toBe('on');
  });
});
