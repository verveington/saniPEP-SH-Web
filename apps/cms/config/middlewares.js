'use strict';

module.exports = ({ env }) => {
  const production = env('NODE_ENV') === 'production';
  const corsOrigins = env.array(
    'CMS_CORS_ORIGINS',
    production ? [] : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  );

  if (production && corsOrigins.length === 0) {
    throw new Error('CMS_CORS_ORIGINS must be explicit in production.');
  }

  return [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      origin: corsOrigins,
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  ];
};
