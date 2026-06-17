'use strict';

module.exports = ({ env }) => ({
  upload: {
    config: {
      sizeLimit: env.int('UPLOAD_SIZE_LIMIT', 10 * 1024 * 1024),
    },
  },
  'users-permissions': {
    config: {
      jwt: {
        expiresIn: '7d',
      },
      register: {
        allowedFields: [],
      },
    },
  },
});
