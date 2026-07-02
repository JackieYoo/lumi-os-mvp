import fs from 'fs/promises';
import path from 'path';
import { registerTool } from '../registry.js';

const ALLOWED_ROOT = process.cwd().replace(/[\\/]$/, '') + path.sep;

function resolveSafePath(inputPath: string): string {
  const resolved = path.resolve(ALLOWED_ROOT, inputPath);
  if (!resolved.startsWith(ALLOWED_ROOT)) {
    throw new Error('Path is outside of allowed directory');
  }
  return resolved;
}

registerTool({
  name: 'read_file',
  description: 'Read the contents of a text file within the project directory.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Relative path to the file from project root',
      },
    },
    required: ['path'],
  },
  async execute(args) {
    const filePath = resolveSafePath(String(args.path));
    const content = await fs.readFile(filePath, 'utf-8');
    return { path: args.path, content: content.slice(0, 10000) };
  },
});

registerTool({
  name: 'list_files',
  description: 'List files and directories at a given relative path.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Relative directory path',
      },
    },
    required: ['path'],
  },
  async execute(args) {
    const dirPath = resolveSafePath(String(args.path));
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return {
      path: args.path,
      entries: entries.map((e) => ({ name: e.name, type: e.isDirectory() ? 'directory' : 'file' })),
    };
  },
});
