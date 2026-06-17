'use strict';

const { publicContentUids, privateContentUids, mediaFolders, editorialRoles } = require('../config/sanipep');

module.exports = {
  register() {},

  async bootstrap({ strapi }) {
    strapi.log.info(
      `[saniPEP CMS] Public content APIs prepared for read-only exposure: ${publicContentUids.join(', ')}`,
    );
    strapi.log.info(`[saniPEP CMS] Private CMS APIs stay unpublished unless explicitly enabled: ${privateContentUids.join(', ')}`);
    strapi.log.info(`[saniPEP CMS] Editorial roles to create in Admin UI: ${editorialRoles.map((role) => role.name).join(', ')}`);
    strapi.log.info(`[saniPEP CMS] Media folders expected: ${mediaFolders.join(', ')}`);
    strapi.log.info('[saniPEP CMS] Do not store prescription files, patient records, free-text requests, or Omnia data in Strapi.');
  },
};
