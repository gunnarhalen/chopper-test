import { readFile } from 'node:fs/promises';

const PUBLIC_DIR = new URL('../public/', import.meta.url);

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

export const STATIC_ROUTES = {
  '/': 'index.html',
  '/app.js': 'app.js',
  '/styles.css': 'styles.css',
};

export async function sendStatic(res, file) {
  const extension = file.slice(file.lastIndexOf('.'));
  try {
    const content = await readFile(new URL(file, PUBLIC_DIR));
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extension] ?? 'application/octet-stream' });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}
