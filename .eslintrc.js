// Architecture rules (CRAWL-P1-003):
//
//   Domain  ←  Application  ←  Infrastructure
//
// - domain/ and application/ must never import crawler/AI/persistence
//   technology (Crawlee, Playwright, AI SDKs, TypeORM, mysql).
// - domain/ must additionally stay framework-free (no NestJS imports).
// - lower layers must not import from higher layers
//   (domain ↛ application/infrastructure, application ↛ infrastructure).
//
// The technology bans live in `restrictedInfrastructureImports` below; the
// layer direction is enforced via `import/no-restricted-paths` zones.

const restrictedInfrastructureImports = [
  {
    group: ['crawlee', '@crawlee/*'],
    message:
      'Crawlee is infrastructure. Depend on a domain port and implement it under */infrastructure/crawlee/.',
  },
  {
    group: ['playwright', 'playwright-core', '@playwright/*'],
    message:
      'Playwright is infrastructure. Depend on a domain port and implement it under */infrastructure/playwright/.',
  },
  {
    group: ['@anthropic-ai/*', 'openai', 'ai', '@ai-sdk/*'],
    message:
      'AI SDKs are infrastructure. Depend on a domain port and implement it under */infrastructure/ai/.',
  },
  {
    group: ['typeorm', '@nestjs/typeorm', 'mysql', 'mysql2', '@prisma/*', 'prisma'],
    message:
      'Persistence is infrastructure. Depend on a repository port and implement it under */infrastructure/.',
  },
];

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'promise', 'import', 'jest'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/typescript',
    'plugin:import/warnings',
    'plugin:jest/recommended',
    'plugin:prettier/recommended',
    'plugin:promise/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist'],
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
      },
    },
  },
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-argument': 'error',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'eol-last': 'warn',
    'import/no-cycle': 'warn',
    'import/no-unresolved': 'off',
    'import/order': ['error'],
    'jest/no-disabled-tests': 'off',
    'jest/no-mocks-import': 'off',
    'no-process-env': 'error',
    'object-shorthand': ['error', 'always'],
    quotes: [1, 'single', { avoidEscape: true }],

    // Layer direction: lower layers must not import from higher layers.
    // Spec files are exempt — tests may compose across layers (e.g. running
    // a domain service against snapshots built by an infrastructure adapter).
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            target: './src/**/domain/**',
            from: './src/**/application/**',
            message: 'Domain must not depend on the application layer.',
          },
          {
            target: './src/**/domain/**',
            from: './src/**/infrastructure/**',
            message: 'Domain must not depend on the infrastructure layer.',
          },
          {
            target: './src/**/application/**',
            from: './src/**/infrastructure/**',
            // IoC/Symbols.ts files hold plain string DI tokens (house
            // convention from messaging-service) — they carry no
            // infrastructure dependencies and may be imported anywhere.
            except: ['**/IoC/**'],
            message: 'Application must not depend on the infrastructure layer.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      // Spec files are exempt from the layer-direction rule — tests may
      // compose across layers (e.g. running a domain service against
      // snapshots built by an infrastructure adapter). The technology bans
      // below still apply.
      files: ['src/**/*.spec.ts'],
      rules: {
        'import/no-restricted-paths': 'off',
      },
    },
    {
      // Application layer: no crawler/AI/persistence technology.
      files: ['src/**/application/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          { patterns: restrictedInfrastructureImports },
        ],
      },
    },
    {
      // Domain layer: no technology AND no framework — plain TypeScript only.
      files: ['src/**/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              ...restrictedInfrastructureImports,
              {
                group: ['@nestjs/*', 'nest-commander'],
                message:
                  'The domain layer is framework-free: no NestJS imports. DI wiring belongs in the module/infrastructure layer.',
              },
            ],
          },
        ],
      },
    },
  ],
};
