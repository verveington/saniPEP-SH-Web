'use strict';

const publicContentUids = [
  'api::contact-setting.contact-setting',
  'api::faq.faq',
  'api::hero-content.hero-content',
  'api::icon-asset.icon-asset',
  'api::landing-page-section.landing-page-section',
  'api::legal-page.legal-page',
  'api::opening-hour.opening-hour',
  'api::portal-help-content.portal-help-content',
  'api::product-group.product-group',
  'api::seo-metadata.seo-metadata',
  'api::service-page.service-page',
  'api::symptom.symptom',
];

const privateContentUids = [
  'api::form-configuration.form-configuration',
];

const mediaFolders = [
  'Logo',
  'Teamfotos',
  'Standortbilder',
  'Leistungsseitenbilder',
  'Produktgruppenbilder',
  'Downloads',
  'Icons',
];

const editorialRoles = [
  {
    name: 'Admin',
    description: 'Technische und fachliche CMS-Administration. Kein Ersatz für Portal-/Auth-Admin.',
  },
  {
    name: 'Redaktion',
    description: 'Kann öffentliche Inhalte erstellen und zur Veröffentlichung vorbereiten.',
  },
  {
    name: 'Mitarbeiter',
    description: 'Kann öffentliche Hilfetexte und Standortinformationen lesen/prüfen, aber keine Gesundheitsdaten verwalten.',
  },
];

module.exports = {
  publicContentUids,
  privateContentUids,
  mediaFolders,
  editorialRoles,
};
