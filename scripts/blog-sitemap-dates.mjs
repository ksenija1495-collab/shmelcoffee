import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const blogRoot = join(__dirname, '../src/content/blog');
const outFile = join(__dirname, '../src/data/blogSitemapDates.json');

function slugFromPath(filePath) {
  const rel = relative(blogRoot, filePath).replace(/\\/g, '/');
  if (rel.endsWith('/index.md')) return rel.replace('/index.md', '');
  return rel.replace(/\.md$/, '');
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.md')) files.push(full);
  }
  return files;
}

const dates = {};
for (const file of walk(blogRoot)) {
  const content = readFileSync(file, 'utf8');
  const date = content.match(/^date:\s*(.+)$/m)?.[1]?.trim();
  const updated = content.match(/^updatedDate:\s*(.+)$/m)?.[1]?.trim();
  const slug = slugFromPath(file);
  const url = `/blog/${slug}/`;
  dates[url] = updated || date || undefined;
}

writeFileSync(outFile, JSON.stringify(dates, null, 2));
console.log(`Wrote ${Object.keys(dates).length} blog lastmod entries → src/data/blogSitemapDates.json`);
