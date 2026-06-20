'use strict';

const path = require('path');

module.exports = ({ env }) => {
  const production = env('NODE_ENV') === 'production';
  const client = env('DATABASE_CLIENT', production ? 'postgres' : 'sqlite');

  if (production && client === 'sqlite') {
    throw new Error('DATABASE_CLIENT=sqlite is development-only. Use postgres in production.');
  }

  const connectionString = env('DATABASE_URL');
  const requiredInProduction = (name, fallback) => {
    const value = env(name, production ? undefined : fallback);
    if (production && !connectionString && !value) {
      throw new Error(`${name} is required in production.`);
    }
    return value;
  };

  const connections = {
    postgres: {
      connection: {
        connectionString,
        host: requiredInProduction('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: requiredInProduction('DATABASE_NAME', 'sanipep_cms'),
        user: requiredInProduction('DATABASE_USERNAME', 'strapi'),
        password: requiredInProduction('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: {
        min: env.int('DATABASE_POOL_MIN', 2),
        max: env.int('DATABASE_POOL_MAX', 10),
      },
    },
    sqlite: {
      connection: {
        filename: path.join(__dirname, '..', env('DATABASE_FILENAME', '.tmp/data.db')),
      },
      useNullAsDefault: true,
    },
  };

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  };
};
