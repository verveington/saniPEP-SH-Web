'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::hero-content.hero-content');
