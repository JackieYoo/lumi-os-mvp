// Skills are higher-level capabilities exposed as tools.
// This module re-exports the tool registry so skills can register themselves
// without coupling to the lower-level tools package.
export { registerTool } from '../tools/registry.js';
export type { Tool } from '../tools/types.js';
