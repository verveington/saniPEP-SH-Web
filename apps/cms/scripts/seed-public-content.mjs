import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { createStrapi } = require('@strapi/strapi');
const { publicContentUids, mediaFolders } = require('../config/sanipep');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cmsRoot = path.resolve(__dirname, '..');
const seedPath = path.join(cmsRoot, 'mock-content', 'public-content.seed.json');

const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const collectionImports = [
  { uid: 'api::opening-hour.opening-hour', items: seed.openingHours, uniqueField: 'weekday' },
  { uid: 'api::landing-page-section.landing-page-section', items: seed.landingPageSections, uniqueField: 'sectionKey' },
  { uid: 'api::service-page.service-page', items: seed.servicePages, uniqueField: 'slug' },
  { uid: 'api::product-group.product-group', items: seed.productGroups, uniqueField: 'slug' },
  { uid: 'api::symptom.symptom', items: seed.symptoms, uniqueField: 'term' },
  { uid: 'api::faq.faq', items: seed.faqs, uniqueField: 'question' },
  { uid: 'api::seo-metadata.seo-metadata', items: seed.seoMetadata, uniqueField: 'route' },
  { uid: 'api::legal-page.legal-page', items: seed.legalPages, uniqueField: 'slug' },
  { uid: 'api::portal-help-content.portal-help-content', items: seed.portalHelpContent, uniqueField: 'topic' },
];

function ensureSafeSeed() {
  if (seed.contentPolicy?.containsRealPatientData !== false) {
    throw new Error('Seed import blocked: contentPolicy.containsRealPatientData must be false.');
  }
}

function routeForServiceSlug(slug) {
  return `/${slug}`;
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function enrichEntry(uid, item) {
  const data = cloneData(item);

  if (uid === 'api::service-page.service-page' && !data.seo) {
    data.seo = seed.seoMetadata.find((entry) => entry.route === routeForServiceSlug(data.slug))?.seo;
  }

  if (uid === 'api::legal-page.legal-page' && !data.seo) {
    data.seo = seed.seoMetadata.find((entry) => entry.route === `/${data.slug}`)?.seo;
  }

  return data;
}

async function upsertCollectionDocument(strapi, { uid, uniqueField, item }) {
  const data = enrichEntry(uid, item);
  const existing = await strapi.documents(uid).findFirst({
    filters: { [uniqueField]: { $eq: data[uniqueField] } },
    status: 'draft',
  });

  if (existing?.documentId) {
    await strapi.documents(uid).update({
      documentId: existing.documentId,
      data,
      status: 'published',
    });
    return 'updated';
  }

  await strapi.documents(uid).create({
    data,
    status: 'published',
  });
  return 'created';
}

async function upsertSingleDocument(strapi, uid, data) {
  const existing = await strapi.documents(uid).findFirst({ status: 'draft' });
  if (existing?.documentId) {
    await strapi.documents(uid).update({
      documentId: existing.documentId,
      data,
      status: 'published',
    });
    return 'updated';
  }

  await strapi.documents(uid).create({
    data,
    status: 'published',
  });
  return 'created';
}

async function ensureMediaFolders(strapi) {
  const folderService = strapi.plugin('upload').service('folder');
  const results = [];

  for (const name of mediaFolders) {
    const exists = await folderService.exists({ name, parent: null });
    if (exists) {
      results.push({ name, status: 'exists' });
      continue;
    }

    await folderService.create({ name });
    results.push({ name, status: 'created' });
  }

  return results;
}

function uidParts(uid) {
  const [type, controller] = uid.split('.');
  return { type, controller };
}

async function configurePublicReadPermissions(strapi) {
  const usersPermissionsService = strapi.plugin('users-permissions').service('users-permissions');
  const roleService = strapi.plugin('users-permissions').service('role');

  await usersPermissionsService.initialize();
  const roles = await roleService.find();
  const publicRole = roles.find((role) => role.type === 'public');
  if (!publicRole) throw new Error('Users & Permissions public role not found.');

  const permissions = usersPermissionsService.getActions({ defaultEnable: false });

  for (const uid of publicContentUids) {
    const { type, controller } = uidParts(uid);
    const controllerPermissions = permissions[type]?.controllers?.[controller];
    if (!controllerPermissions) continue;
    if (controllerPermissions.find) controllerPermissions.find.enabled = true;
    if (controllerPermissions.findOne) controllerPermissions.findOne.enabled = true;
  }

  await roleService.updateRole(publicRole.id, {
    name: publicRole.name,
    description: 'Read-only access to published public saniPEP CMS content.',
    permissions,
  });
}

async function main() {
  ensureSafeSeed();
  process.chdir(cmsRoot);

  const strapi = await createStrapi({ appDir: cmsRoot, distDir: cmsRoot }).load();
  const summary = {
    singleTypes: {},
    collections: {},
    mediaFolders: [],
    publicPermissions: 'pending',
  };

  try {
    summary.singleTypes.contactSetting = await upsertSingleDocument(
      strapi,
      'api::contact-setting.contact-setting',
      seed.contactSetting,
    );

    for (const importConfig of collectionImports) {
      summary.collections[importConfig.uid] = { created: 0, updated: 0 };
      for (const item of importConfig.items) {
        const status = await upsertCollectionDocument(strapi, { ...importConfig, item });
        summary.collections[importConfig.uid][status] += 1;
      }
    }

    summary.mediaFolders = await ensureMediaFolders(strapi);
    await configurePublicReadPermissions(strapi);
    summary.publicPermissions = 'read-only-public-content';

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await strapi.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
