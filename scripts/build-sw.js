// Después de "vite build": escribe en dist/sw.js la lista de archivos generados
// y una versión nueva, para que el service worker actualice la caché en cada despliegue.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const dist = 'dist';

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

const assets = listFiles(join(dist, 'assets')).map((file) => '/' + relative(dist, file).split(sep).join('/'));

const hash = createHash('sha256');
// La versión cambia si cambia cualquier archivo de la app o del propio service worker.
const hashed = [join(dist, 'index.html'), join(dist, 'sw.js'), ...listFiles(join(dist, 'js')), ...assets.map((a) => join(dist, a))];
for (const file of hashed) {
  hash.update(readFileSync(file));
}
const version = hash.digest('hex').slice(0, 10);

const swPath = join(dist, 'sw.js');
const sw = readFileSync(swPath, 'utf8')
  .replace("'__BUILD_VERSION__'", `'${version}'`)
  .replace('/*__PRECACHE_ASSETS__*/[]', JSON.stringify(assets));
writeFileSync(swPath, sw);

console.log(`sw.js: versión ${version}, ${assets.length} archivos en precaché`);
