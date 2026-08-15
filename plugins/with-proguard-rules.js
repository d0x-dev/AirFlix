const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const RULES = `
# Add any project specific keep options here:

# libtorrent4j (Required for JNI to find the classes and methods)
-keep class org.libtorrent4j.** { *; }
-keep interface org.libtorrent4j.** { *; }
-keep enum org.libtorrent4j.** { *; }

# Keep custom native modules (both com.airflix and dynamic package)
-keep class com.airflix.** { *; }
`;

module.exports = function withProguardRules(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const proguardRulesFile = path.join(
        cfg.modRequest.projectRoot,
        'android',
        'app',
        'proguard-rules.pro'
      );
      
      const packageName = cfg.android?.package || 'com.airflix';

      if (fs.existsSync(proguardRulesFile)) {
        let content = fs.readFileSync(proguardRulesFile, 'utf8');
        if (!content.includes('org.libtorrent4j')) {
          content += RULES;
          // Add the current package name to proguard rules
          if (packageName !== 'com.airflix') {
            content += `-keep class ${packageName}.** { *; }\n`;
          }
          fs.writeFileSync(proguardRulesFile, content, 'utf8');
        }
      }
      return cfg;
    },
  ]);
};
