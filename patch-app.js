const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(
  "import React, {useEffect, useState} from 'react';",
  "import React, {useEffect, useState} from 'react';\nimport {useFonts} from 'expo-font';"
);
content = content.replace(
  "const App = () => {",
  "const App = () => {\n  const [fontsLoaded] = useFonts({\n    'Linotee': require('../assets/fonts/Linotee.ttf'),\n  });"
);
content = content.replace(
  "await BootSplash.hide({fade: true});",
  "if (fontsLoaded) {\n                    await BootSplash.hide({fade: true});\n                  }"
);
fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx patched');
