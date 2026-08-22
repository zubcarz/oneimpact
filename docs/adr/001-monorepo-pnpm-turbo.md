# ADR-001: Monorepo with pnpm workspaces + Turborepo

Date: 2026-08-22 · Status: accepted

## Context
Three deployables (Expo app, NestJS API, Next.js admin) share a domain contract (zod schemas, enums, pricing) and design tokens. The technical test asks for a single public repository.

## Decision
pnpm workspaces with `node-linker=hoisted` (required so Metro resolves React Native packages from a single `node_modules`) and Turborepo for task orchestration. Expo's `metro.config.js` adds the workspace root to `watchFolders` and `nodeModulesPaths`.

## Consequences
- One install, shared types, CI runs only affected packages.
- Jest versions must be aligned across apps (jest-expo 57 requires Jest 29; the API was pinned to Jest 29).
- Prisma pinned to v6 (v7 changes config/driver model; not needed now).
