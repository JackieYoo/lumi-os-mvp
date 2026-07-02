import path from 'path';
import pdfParse from 'pdf-parse-fixed';

export interface ExtractionResult {
  text: string;
  preview: string;
}

const TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.markdown',
  '.json',
  '.csv',
  '.ts',
  '.js',
  '.tsx',
  '.jsx',
  '.py',
  '.html',
  '.css',
  '.sql',
  '.yaml',
  '.yml',
  '.xml',
]);

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function makePreview(text: string, maxLength = 300): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function canExtract(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return TEXT_EXTENSIONS.has(ext) || ext === '.pdf';
}

export async function extractText(filename: string, buffer: Buffer): Promise<ExtractionResult> {
  const ext = path.extname(filename).toLowerCase();

  if (TEXT_EXTENSIONS.has(ext)) {
    const text = cleanText(buffer.toString('utf-8'));
    return { text, preview: makePreview(text) };
  }

  if (ext === '.pdf') {
    const parsed = await pdfParse(buffer);
    const text = cleanText(parsed.text);
    return { text, preview: makePreview(text) };
  }

  throw new Error(`Unsupported file type: ${ext}`);
}
