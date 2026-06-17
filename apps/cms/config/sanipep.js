'use strict';

const publicContentUids = [
  'api::contact-setting.contact-setting',
  'api::faq.faq',
  'api::hero-content.hero-content',
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
];

const editorialRoles = [
  {
    name: 'Admin',
    description: 'Technische und fachliche CMS-Administration. Kein Ersatz fuer Portal-/Auth-Admin.',
  },
  {
    name: 'Redaktion',
    description: 'Kann oeffentliche Inhalte erstellen und zur Veroeffentlichung vorbereiten.',
  },
  {
    name: 'Mitarbeiter',
    description: 'Kann oeffentliche Hilfetexte und Standortinformationen lesen/pruefen, aber keine Gesundheitsdaten verwalten.',
  },
];

module.exports = {
  publicContentUids,
  privateContentUids,
  mediaFolders,
  editorialRoles,
};
