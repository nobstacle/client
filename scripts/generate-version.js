const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const versionData = {
  buildId: Date.now().toString(),
  timestamp: new Date().toISOString(),
  /** Clients compare buildId; on change they purge storage, caches, and service workers. */
  purgeClientStorage: true,
};

fs.writeFileSync(
  path.join(publicDir, 'version.json'),
  JSON.stringify(versionData, null, 2)
);

console.log(`[Version Generator] Created version.json with buildId: ${versionData.buildId}`);
