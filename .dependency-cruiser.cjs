/**
 * Architecture rules for the src/ layering:
 *
 *   app (routes)  →  components  →  components/ui
 *        │               │
 *        ├───────────→  lib (actions/auth/validation)
 *        │               │
 *        └───────────→  db
 *
 * components/ui and lib/validation are leaves; nothing imports from app.
 */
module.exports = {
  forbidden: [
    {
      name: 'ui-is-a-leaf',
      comment:
        'components/ui are pure presentational primitives — they may not import from any other src module (no lib, db, app, or feature components).',
      severity: 'error',
      from: { path: '^src/components/ui' },
      to: { path: '^src', pathNot: '^src/components/ui' },
    },
    {
      name: 'validation-is-pure',
      comment:
        'lib/validation holds pure Zod schemas — no imports from other src modules.',
      severity: 'error',
      from: { path: '^src/lib/validation' },
      to: { path: '^src', pathNot: '^src/lib/validation' },
    },
    {
      name: 'no-imports-from-app',
      comment:
        'src/app is the top layer (routes) — shared code must never reach into it.',
      severity: 'error',
      from: { path: '^src', pathNot: '^src/app' },
      to: { path: '^src/app' },
    },
    {
      name: 'components-must-not-touch-db',
      comment:
        'Components (client boundary) go through lib/actions or receive data via props — never straight to src/db.',
      severity: 'error',
      from: { path: '^src/components' },
      to: { path: '^src/db' },
    },
    {
      name: 'lib-must-not-import-ui',
      comment:
        'lib is server/domain logic — it may not depend on React components.',
      severity: 'error',
      from: { path: '^src/lib' },
      to: { path: '^src/components' },
    },
    {
      name: 'db-is-low-level',
      comment:
        'src/db sits at the bottom — no imports from app, components, or lib. Exception: seed.ts is a CLI script and reuses lib/auth/password for hashing.',
      severity: 'error',
      from: { path: '^src/db', pathNot: '^src/db/seed\\.ts$' },
      to: { path: '^src/(app|components|lib)' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies make slices impossible to reason about.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'Flag files nothing imports — dead code or a missing wiring.',
      from: {
        orphan: true,
        pathNot: [
          '\\.d\\.ts$',
          '\\.test\\.ts$',
          '^src/db/seed\\.ts$',
          '^src/proxy\\.ts$',
          '^src/app', // Next.js entrypoints are loaded by the framework
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    exclude: { path: '\\.test\\.ts$' },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};