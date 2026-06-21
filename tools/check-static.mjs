import { readFile } from 'node:fs/promises';

const requiredFiles = ['site/index.html', 'site/styles.css', 'site/app.js', 'netlify.toml'];

for (const file of requiredFiles) {
  const contents = await readFile(file, 'utf8');
  if (!contents.trim()) {
    throw new Error(`${file} is empty`);
  }
}

const html = await readFile('site/index.html', 'utf8');
for (const asset of ['styles.css', 'app.js']) {
  if (!html.includes(asset)) {
    throw new Error(`index.html does not reference ${asset}`);
  }
}

const css = await readFile('site/styles.css', 'utf8');
for (const token of ['--color-bg', '--color-primary', '--color-accent']) {
  if (!css.includes(token)) {
    throw new Error(`styles.css is missing ${token}`);
  }
}

console.log('Static OpenScapes files look deployable.');
