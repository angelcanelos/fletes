// Publica en GitHub Releases el instalador ya compilado por
// `npm run electron:build`, junto con latest.yml (lo que la app consulta
// para saber si hay versión nueva) y el .blockmap.
//
// Se hace a mano en vez de con `electron-builder --publish always`
// porque este lanzaba dos subidas en paralelo que chocaban al crear la
// release: una fallaba con 422 y latest.yml se quedaba sin subir, así que
// la app nunca veía la versión nueva.
//
// Requiere GH_TOKEN con permiso Contents: Read and write sobre el repo, y
// que el commit actual ya esté en GitHub (git push).
import { readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execSync } from 'node:child_process';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const { owner, repo } = pkg.build.publish[0];
const version = pkg.version;
const tag = `v${version}`;
const carpeta = pkg.build.directories.output;
const instalador = pkg.build.nsis.artifactName.replace('${version}', version).replace('${ext}', 'exe');
const archivos = [instalador, `${instalador}.blockmap`, 'latest.yml'].map((n) => join(carpeta, n));

const token = process.env.GH_TOKEN;
if (!token) salir('Falta la variable GH_TOKEN.');
for (const f of archivos) if (!existsSync(f)) salir(`No existe ${f}. Corre primero npm run electron:build.`);
const yml = readFileSync(join(carpeta, 'latest.yml'), 'utf8');
if (!yml.startsWith(`version: ${version}\n`)) salir(`latest.yml no es de la versión ${version}. Vuelve a compilar.`);

const api = `https://api.github.com/repos/${owner}/${repo}`;
const headers = { Authorization: `Bearer ${token}`, 'User-Agent': 'fletes-release', Accept: 'application/vnd.github+json' };

const commit = execSync('git -c safe.directory=* rev-parse HEAD').toString().trim();
const enGithub = await fetch(`${api}/commits/${commit}`, { headers });
if (!enGithub.ok) salir(`El commit ${commit.slice(0, 7)} no está en GitHub. Haz git push primero.`);

const existente = await fetch(`${api}/releases/tags/${tag}`, { headers });
if (existente.ok) salir(`Ya existe la release ${tag}. Sube la versión en package.json.`);

console.log(`Creando release ${tag} en ${owner}/${repo} (commit ${commit.slice(0, 7)})…`);
const creada = await fetch(`${api}/releases`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ tag_name: tag, target_commitish: commit, name: version, draft: false })
});
if (!creada.ok) salir(`No se pudo crear la release: ${creada.status} ${await creada.text()}`);
const release = await creada.json();

for (const f of archivos) {
  const nombre = basename(f);
  console.log(`Subiendo ${nombre}…`);
  const r = await fetch(`https://uploads.github.com/repos/${owner}/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(nombre)}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/octet-stream' },
    body: readFileSync(f)
  });
  if (!r.ok) salir(`Falló la subida de ${nombre}: ${r.status} ${await r.text()}`);
}

console.log(`Listo: ${release.html_url}`);

function salir(mensaje) {
  console.error(`✖ ${mensaje}`);
  process.exit(1);
}
