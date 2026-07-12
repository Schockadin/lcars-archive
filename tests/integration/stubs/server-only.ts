// Next's bundler special-cases the bare "server-only" specifier; plain Vite/
// Vitest doesn't know it (it isn't a real npm package). This empty stub is
// aliased in vitest.integration.config.ts so files that `import "server-only"`
// remain importable under Vitest.
