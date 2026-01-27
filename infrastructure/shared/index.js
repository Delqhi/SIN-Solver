const healthCheck = require('./health-check');
const eventBus = require('./event-bus');
const serviceClient = require('./service-client');

module.exports = {
  ...healthCheck,
  ...eventBus,
  serviceClient
};
