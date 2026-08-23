const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
// Monorepo: watch the workspace packages and hoisted node_modules, not the whole
// repo root. `.claude/worktrees/` holds live git worktrees with their own
// node_modules; their temp files (pnpm, prettier) appear and vanish while
// another lane works, and Metro's watcher dies with ENOENT when they do.
config.watchFolders = [
  path.resolve(workspaceRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'packages'),
];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = withNativeWind(config, { input: './global.css' });
