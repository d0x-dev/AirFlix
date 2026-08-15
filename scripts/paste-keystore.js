const fs = require('fs');
const path = require('path');

const KEYSTORE_SOURCE = path.join(__dirname, '..', 'airflix-key.keystore');
const KEYSTORE_DEST = path.join(
  __dirname,
  '..',
  'android',
  'app',
  'airflix-key.keystore',
);

function pasteKeystore() {
  try {
    if (!fs.existsSync(KEYSTORE_SOURCE)) {
      console.error('Error: Keystore file not found at:', KEYSTORE_SOURCE);

      process.exit(1);
    }

    const androidAppDir = path.dirname(KEYSTORE_DEST);
    if (!fs.existsSync(androidAppDir)) {
      fs.mkdirSync(androidAppDir, {recursive: true});
    }

    fs.copyFileSync(KEYSTORE_SOURCE, KEYSTORE_DEST);
    console.log('Keystore file successfully copied to:', KEYSTORE_DEST);
  } catch (error) {
    console.error('Error copying keystore:', error.message);
    process.exit(1);
  }
}

pasteKeystore();
