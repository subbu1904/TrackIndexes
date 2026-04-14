import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const replacements = [
  {
    file: 'node_modules/@capacitor/android/capacitor/build.gradle',
    from: 'JavaVersion.VERSION_21',
    to: 'JavaVersion.VERSION_17',
  },
  {
    file: 'android/app/capacitor.build.gradle',
    from: 'JavaVersion.VERSION_21',
    to: 'JavaVersion.VERSION_17',
  },
];

let patchedCount = 0;

for (const replacement of replacements) {
  const filePath = resolve(process.cwd(), replacement.file);
  if (!existsSync(filePath)) {
    continue;
  }

  const current = readFileSync(filePath, 'utf8');
  if (!current.includes(replacement.from)) {
    continue;
  }

  const next = current.split(replacement.from).join(replacement.to);
  writeFileSync(filePath, next, 'utf8');
  patchedCount += 1;
  console.info(`[patch-capacitor-java17] Patched ${replacement.file}`);
}

if (patchedCount === 0) {
  console.info('[patch-capacitor-java17] No Java 21 references required patching.');
}
