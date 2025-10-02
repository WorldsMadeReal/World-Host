// Fallback type declarations for monorepo builds where package resolution
// may not pick up the generated .d.ts from @worldhost/shared.
// This re-exports types directly from the shared source for TypeScript only.

declare module '@worldhost/shared' {
  export * from '../../../shared/dist/index';
}


