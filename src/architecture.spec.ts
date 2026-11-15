import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? sources(join(dir, e.name))
      : e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts')
        ? [join(dir, e.name)]
        : [],
  );
}
describe('Clean Architecture dependency boundaries', () => {
  for (const layer of ['domain', 'application', 'infrastructure']) {
    it(`${layer} only imports permitted layers and dependencies`, () => {
      for (const file of sources(join(__dirname, layer))) {
        const imports = [
          ...readFileSync(file, 'utf8').matchAll(
            /(?:from\s+|import\s*\()['"]([^'"]+)/g,
          ),
        ].map((m) => m[1]);
        const forbidden = imports.filter(
          (i) =>
            /\/presentation\//.test(i) ||
            (layer !== 'infrastructure' &&
              /@nestjs|drizzle|\/infrastructure\/|^pg$/.test(i)) ||
            (layer === 'domain' && /\/application\//.test(i)),
        );
        expect(forbidden).toEqual([]);
      }
    });
  }
});
