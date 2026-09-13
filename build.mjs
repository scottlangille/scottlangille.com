import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = dirname(fileURLToPath(import.meta.url));
const system = resolve(root, '../design-system');
const require = createRequire(join(system, 'package.json'));
const { build } = createRequire(require.resolve('tsup'))('esbuild');
await mkdir(join(root, 'assets'), { recursive: true });
await build({
  entryPoints: [join(root, 'site.jsx')],
  outfile: join(root, 'assets/site.js'),
  bundle: true, minify: true, format: 'esm', platform: 'browser',
  define: { 'process.env.NODE_ENV': '"production"' },
  alias: {
    '@scott/ui': join(system, 'dist/index.js'),
    'react-dom/client': require.resolve('react-dom/client'),
    'react': dirname(require.resolve('react/package.json')),
  },
});
await cp(join(system, 'dist/styles.css'), join(root, 'assets/scott-ui.css'));
await cp(join(system, 'dist/assets'), join(root, 'assets/assets'), { recursive: true });

// Version every local entry asset so refresh loads a matching build.
const htmlPath = join(root, 'index.html');
let html = await readFile(htmlPath, 'utf8');
for (const asset of ['assets/site.js', 'assets/scott-ui.css', 'playground.css']) {
  const version = createHash('sha256').update(await readFile(join(root, asset))).digest('hex').slice(0, 12);
  const escaped = asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  html = html.replace(new RegExp(`(src|href)="${escaped}(?:\\?[^"\\s]*)?"`, 'g'), `$1="${asset}?v=${version}"`);
}
await writeFile(htmlPath, html);
