const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer to project-local directory
  // This ensures Chrome binaries are retained on cloud deployments (e.g., Render)
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
