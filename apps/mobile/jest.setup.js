// Global Jest setup for apps/mobile, registered via the "jest.setupFiles" key
// in package.json (merged with jest-expo's own setupFiles, not replacing it).
//
// react-native-reanimated v4 delegates its native worklets runtime to the
// separate `react-native-worklets` package. Its module entrypoint runs a
// native turbo-module init unconditionally at import time (it does not check
// for a test environment the way reanimated itself does), so anything that
// pulls in real reanimated code -- directly, or through the `@/components/ui`
// barrel, which re-exports `CardPreview.tsx` -- crashes under jest-expo with
// "Cannot read properties of undefined (reading 'loadUnpackers')".
//
// `react-native-worklets` ships its own jest-safe mock (a plain JS stand-in,
// no native calls) at `src/mock.ts` (there is no root-level `mock.js` entry
// point for this package, unlike `react-native-reanimated`). Redirecting the
// package to it here means reanimated's own `SHOULD_BE_USE_WEB` (true under
// Jest) pure-JS code path can run for real in every suite, without each test
// file hand-rolling a `jest.mock('react-native-reanimated', ...)`.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
