'use strict';

module.exports = ({ env }) => {
  const production = env('NODE_ENV') === 'production';
  const requiredSecret = (name) => {
    const value = env(name);
    if (production && (!value || value.length < 16)) {
      throw new Error(`${name} must be set in production.`);
    }
    return value;
  };

  return {
    auth: {
      secret: requiredSecret('ADMIN_JWT_SECRET'),
    },
    apiToken: {
      salt: requiredSecret('API_TOKEN_SALT'),
    },
    transfer: {
      token: {
        salt: requiredSecret('TRANSFER_TOKEN_SALT'),
      },
    },
    secrets: {
      encryptionKey: requiredSecret('ENCRYPTION_KEY'),
    },
    flags: {
      nps: false,
      promoteEE: false,
    },
  };
};
