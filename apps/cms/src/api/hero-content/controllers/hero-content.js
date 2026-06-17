'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::hero-content.hero-content');
