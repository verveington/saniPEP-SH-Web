'use strict';

module.exports = ({ env }) => {
  const production = env('NODE_ENV') === 'production';
  const appKeys = env.array('APP_KEYS');

  if (production && appKeys.length < 2) {
    throw new Error('APP_KEYS must contain at least two keys in production.');
  }

  return {
    host: env('HOST', production ? '0.0.0.0' : '127.0.0.1'),
    port: env.int('PORT', 1337),
    app: {
      keys: appKeys,
    },
    webhooks: {
      populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
    },
  };
};
