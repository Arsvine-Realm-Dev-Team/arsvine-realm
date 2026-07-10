import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const rollbackIndex = process.argv.indexOf('--rollback');
const rollbackVersion = rollbackIndex >= 0 ? process.argv[rollbackIndex + 1] : '';
const root = process.cwd();
const coscli = process.env.COSCLI_PATH || path.join(root, 'cos-workspace', 'coscli-windows-amd64.exe');

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function clientArgs(region) {
  const values = ['--init-skip', '--disable-log', '-e', `cos.${region}.myqcloud.com`, '-i', required('COS_SECRET_ID'), '-k', required('COS_SECRET_KEY')];
  if (process.env.COS_SESSION_TOKEN) values.push('--token', process.env.COS_SESSION_TOKEN);
  return values;
}

async function cos(region, commandArgs) {
  const printable = [path.basename(coscli), ...commandArgs].join(' ');
  if (dryRun) { console.log(`[assets:publish] dry-run ${printable}`); return; }
  await execFileAsync(coscli, [...clientArgs(region), ...commandArgs], { cwd: root, windowsHide: true });
}

async function revalidate() {
  if (dryRun) { console.log('[assets:publish] dry-run POST /api/revalidate-assets'); return; }
  const response = await fetch(`${required('NEXT_PUBLIC_SITE_URL').replace(/\/$/, '')}/api/revalidate-assets`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ secret: required('REVALIDATE_SECRET') }),
  });
  if (!response.ok) throw new Error(`Asset revalidation failed with HTTP ${response.status}`);
}

async function writePointer(version) {
  if (!/^\d{8}T\d{6}Z$/.test(version)) throw new Error(`Invalid catalog version: ${version}`);
  const temp = await mkdtemp(path.join(os.tmpdir(), 'arsvine-pointer-'));
  const pointer = path.join(temp, 'current.json');
  await writeFile(pointer, `${JSON.stringify({ version }, null, 2)}\n`);
  const publicBucket = required('COS_PUBLIC_BUCKET');
  const privateBucket = required('COS_PRIVATE_BUCKET');
  await cos(required('COS_PUBLIC_REGION'), ['cp', pointer, `cos://${publicBucket}/realm/site-catalog/current.json`, '--meta', 'Cache-Control:no-cache,max-age=0,must-revalidate']);
  await cos(required('COS_PRIVATE_REGION'), ['cp', pointer, `cos://${privateBucket}/realm/catalog/current.json`, '--meta', 'Cache-Control:no-store']);
}

async function main() {
  if (rollbackVersion) {
    await writePointer(rollbackVersion);
    await revalidate();
    console.log(`[assets:publish] rolled back to ${rollbackVersion}`);
    return;
  }

  const manifest = JSON.parse(await readFile(path.join(root, 'dist', 'local-manifest', 'manifest.generated.json'), 'utf-8'));
  const version = manifest.version;
  if (!/^\d{8}T\d{6}Z$/.test(version)) throw new Error('Generated manifest has an invalid version');
  const publicBucket = required('COS_PUBLIC_BUCKET');
  const privateBucket = required('COS_PRIVATE_BUCKET');
  const publicRegion = required('COS_PUBLIC_REGION');
  const privateRegion = required('COS_PRIVATE_REGION');

  await cos(publicRegion, ['cp', path.join(root, 'dist', 'cos-upload', 'public-root'), `cos://${publicBucket}/`, '-r']);
  await cos(privateRegion, ['cp', path.join(root, 'dist', 'cos-upload', 'private-root'), `cos://${privateBucket}/`, '-r']);
  await cos(publicRegion, ['ls', `cos://${publicBucket}/realm/site-catalog/versions/${version}/assets.json`]);
  await cos(privateRegion, ['ls', `cos://${privateBucket}/realm/catalog/versions/${version}/static-assets.json`]);
  await writePointer(version);
  await revalidate();
  console.log(`[assets:publish] ${dryRun ? 'dry-run complete for' : 'published'} ${version}`);
}

main().catch((error) => { console.error('[assets:publish] FAILED:', error.message); process.exit(1); });
