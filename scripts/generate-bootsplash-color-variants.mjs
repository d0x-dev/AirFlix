import fs from 'node:fs';
import path from 'node:path';
import {PNG} from 'pngjs';

const variants = {
  white: [255, 255, 255],
  tomato: [255, 99, 71],
  gray: [158, 158, 158],
  blue: [33, 150, 243],
  lavender: [178, 164, 212],
};

const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
const projectRoot = process.cwd();

const isTomatoPixel = (red, green, blue, alpha) =>
  alpha > 0 && red - green > 45 && red - blue > 35;

for (const density of densities) {
  const sourcePath = path.join(
    projectRoot,
    'assets',
    'bootsplash',
    'android',
    `drawable-${density}`,
    'bootsplash_logo.png',
  );
  const source = PNG.sync.read(fs.readFileSync(sourcePath));

  for (const [name, color] of Object.entries(variants)) {
    const output = PNG.sync.read(PNG.sync.write(source));
    for (let offset = 0; offset < output.data.length; offset += 4) {
      const red = output.data[offset];
      const green = output.data[offset + 1];
      const blue = output.data[offset + 2];
      const alpha = output.data[offset + 3];
      if (!isTomatoPixel(red, green, blue, alpha)) {
        continue;
      }
      output.data[offset] = color[0];
      output.data[offset + 1] = color[1];
      output.data[offset + 2] = color[2];
    }

    const filename = `bootsplash_logo_${name}.png`;
    const generated = PNG.sync.write(output);
    fs.writeFileSync(path.join(path.dirname(sourcePath), filename), generated);
    fs.writeFileSync(
      path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'res',
        `drawable-${density}`,
        filename,
      ),
      generated,
    );
  }
}
