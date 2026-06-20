import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { createStrapi } = require('@strapi/strapi');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cmsRoot = path.resolve(__dirname, '..');
const sharedIconRoot = path.resolve(cmsRoot, '..', 'shared', 'icons');
const iconRoot = path.join(cmsRoot, 'public', 'uploads', 'icons');
const outlinePngRoot = path.join(sharedIconRoot, 'png', 'outline');
const runtimeOutlinePngRoot = path.join(iconRoot, 'png', 'outline');
const metadataPath = path.join(sharedIconRoot, 'meta-data.json');
const publicUrlPrefix = '/uploads/icons/png/outline';

const include2x = process.argv.includes('--include-2x');
const dryRun = process.argv.includes('--dry-run');

const publicCategories = new Set(['body', 'devices', 'objects', 'symbols']);

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const metadataByPath = new Map(
  (readJsonIfExists(metadataPath) ?? []).map((entry) => [entry.path, entry]),
);

function walkFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(entryPath);
    if (!entry.isFile()) return [];
    if (entry.name.startsWith('.')) return [];
    if (!entry.name.toLowerCase().endsWith('.png')) return [];
    if (!include2x && entry.name.includes('@2x')) return [];
    return [entryPath];
  });
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function toTitle(value) {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getPngDimensions(filePath) {
  const header = fs.readFileSync(filePath).subarray(0, 24);
  const signature = header.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') return {};
  return {
    width: header.readUInt32BE(16),
    height: header.readUInt32BE(20),
  };
}

function getCategory(key) {
  const category = key.split('/')[0];
  return publicCategories.has(category) ? category : 'other';
}

function getPurpose(key) {
  if (
    [
      'objects/phone',
      'symbols/forum',
      'symbols/geo_location',
      'symbols/secure_communication',
    ].includes(key)
  ) {
    return 'contact';
  }

  if (
    [
      'symbols/health_data_security',
      'symbols/i_documents_accepted',
      'symbols/medical_advice',
    ].includes(key)
  ) {
    return 'legal';
  }

  if (['symbols/yes', 'symbols/cancel', 'symbols/alert', 'symbols/alert_circle'].includes(key)) {
    return 'status';
  }

  if (
    [
      'objects/prescription_document',
      'symbols/i_schedule_school_date_time',
      'symbols/rx',
    ].includes(key)
  ) {
    return 'form';
  }

  if (key.startsWith('body/') || key.startsWith('devices/')) return 'service';
  return 'content';
}

function getStableHash(key) {
  return `icon_${crypto.createHash('sha1').update(key).digest('hex').slice(0, 16)}`;
}

function buildIconEntries() {
  if (!fs.existsSync(outlinePngRoot)) {
    throw new Error(`Icon source directory not found: ${outlinePngRoot}`);
  }

  return walkFiles(outlinePngRoot).map((filePath) => {
    const relativeFile = toPosixPath(path.relative(outlinePngRoot, filePath));
    const key = relativeFile.replace(/\.png$/i, '');
    const metadata = metadataByPath.get(key);
    const label = metadata?.title ?? toTitle(path.basename(key));
    const stats = fs.statSync(filePath);
    const dimensions = getPngDimensions(filePath);

    return {
      key,
      label,
      category: getCategory(key),
      purpose: getPurpose(key),
      filePath,
      runtimeFilePath: path.join(runtimeOutlinePngRoot, relativeFile),
      fileName: path.basename(filePath),
      url: `${publicUrlPrefix}/${relativeFile}`,
      sizeBytes: stats.size,
      ...dimensions,
    };
  });
}

async function ensureIconsFolder(strapi) {
  const folderQuery = strapi.db.query('plugin::upload.folder');
  const existing = await folderQuery.findOne({ where: { name: 'Icons', parent: null } });
  if (existing) return existing;
  return strapi.plugin('upload').service('folder').create({ name: 'Icons' });
}

function ensureRuntimeIconFile(entry) {
  fs.mkdirSync(path.dirname(entry.runtimeFilePath), { recursive: true });
  fs.copyFileSync(entry.filePath, entry.runtimeFilePath);
}

async function upsertMediaFile(strapi, entry, folder) {
  ensureRuntimeIconFile(entry);

  const fileQuery = strapi.db.query('plugin::upload.file');
  const data = {
    name: entry.fileName,
    alternativeText: entry.label,
    caption: `Global outline icon: ${entry.key}`,
    width: entry.width,
    height: entry.height,
    formats: null,
    hash: getStableHash(entry.key),
    ext: '.png',
    mime: 'image/png',
    size: entry.sizeBytes / 1000,
    sizeInBytes: entry.sizeBytes,
    url: entry.url,
    provider: 'local',
    folder: folder.id,
    folderPath: folder.path,
  };

  const existing = await fileQuery.findOne({ where: { url: entry.url } });
  if (existing) {
    return {
      file: await fileQuery.update({ where: { id: existing.id }, data }),
      status: 'updated',
    };
  }

  return {
    file: await fileQuery.create({ data }),
    status: 'created',
  };
}

async function upsertIconAsset(strapi, entry, file) {
  const data = {
    key: entry.key,
    label: entry.label,
    category: entry.category,
    purpose: entry.purpose,
    file: file.id,
    altText: entry.label,
    isGlobal: true,
    safeForPublic: true,
    usageBoundary:
      'Nur fuer Bedeutungs-, Content- und Service-Icons. Bedienung und Navigation nutzen Reshaped/Lucide-Glyphen.',
  };

  const existing = await strapi.documents('api::icon-asset.icon-asset').findFirst({
    filters: { key: { $eq: entry.key } },
    status: 'draft',
  });

  if (existing?.documentId) {
    await strapi.documents('api::icon-asset.icon-asset').update({
      documentId: existing.documentId,
      data,
      status: 'published',
    });
    return 'updated';
  }

  await strapi.documents('api::icon-asset.icon-asset').create({
    data,
    status: 'published',
  });
  return 'created';
}

async function main() {
  const entries = buildIconEntries();

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
            source: outlinePngRoot,
            runtimeTarget: runtimeOutlinePngRoot,
            total: entries.length,
          include2x,
          examples: entries.slice(0, 10).map(({ key, url }) => ({ key, url })),
        },
        null,
        2,
      ),
    );
    return;
  }

  process.chdir(cmsRoot);
  const strapi = await createStrapi({ appDir: cmsRoot, distDir: cmsRoot }).load();
  const summary = {
    source: outlinePngRoot,
    runtimeTarget: runtimeOutlinePngRoot,
    include2x,
    scanned: entries.length,
    media: { created: 0, updated: 0 },
    iconAssets: { created: 0, updated: 0 },
    skipped: 0,
  };

  try {
    const folder = await ensureIconsFolder(strapi);

    for (const entry of entries) {
      if (!entry.key || !entry.url) {
        summary.skipped += 1;
        continue;
      }

      const mediaResult = await upsertMediaFile(strapi, entry, folder);
      summary.media[mediaResult.status] += 1;
      const iconStatus = await upsertIconAsset(strapi, entry, mediaResult.file);
      summary.iconAssets[iconStatus] += 1;
    }

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await strapi.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
