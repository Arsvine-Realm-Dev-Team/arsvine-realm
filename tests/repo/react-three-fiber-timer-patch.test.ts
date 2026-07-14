import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('React Three Fiber timer compatibility patch', () => {
  it('patches the installed Fiber version through pnpm', () => {
    const workspace = readSource('pnpm-workspace.yaml');

    expect(workspace).toContain(
      "'@react-three/fiber@9.6.1': patches/@react-three__fiber@9.6.1.patch",
    );
  });

  it('replaces Fiber clock construction with a Timer-backed compatibility clock', () => {
    const patch = readSource('patches/@react-three__fiber@9.6.1.patch');

    expect(patch).toContain('new THREE.Timer()');
    expect(patch).toContain('new THREE__namespace.Timer()');
    expect(patch).toContain('Timer.prototype.getDelta.call(clock)');
    expect(patch).toContain('-      clock: new THREE.Clock(),');
    expect(patch).toContain('-      clock: new THREE__namespace.Clock(),');
  });
});
