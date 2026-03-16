import StyleDictionary from 'style-dictionary';
import { watch } from 'node:fs';
import config from '../style-dictionary.config.js';

const TOKENS_SOURCE = 'tokens/figma-tokens.json';
const WATCH_DEBOUNCE_MS = 250;
const isWatchMode = process.argv.includes('--watch');

async function buildTokens() {
  console.log('Building design tokens...\n');

  const sd = new StyleDictionary(config);
  await sd.buildAllPlatforms();

  console.log('Design tokens built successfully.');
  console.log('Output files:');
  console.log('  - tokens/build/tokens.css (CSS variables)');
  console.log('  - tokens/build/tailwind.theme.css (Tailwind theme extension)\n');
}

let buildInProgress = false;
let queuedBuild = false;

async function runBuildQueue() {
  if (buildInProgress) {
    queuedBuild = true;
    return;
  }

  buildInProgress = true;
  try {
    await buildTokens();
  } catch (error) {
    console.error('Token build failed:', error);
  } finally {
    buildInProgress = false;
  }

  if (queuedBuild) {
    queuedBuild = false;
    await runBuildQueue();
  }
}

await runBuildQueue();

if (isWatchMode) {
  console.log(`Watching ${TOKENS_SOURCE} for changes...\n`);

  let debounceTimer;
  watch(TOKENS_SOURCE, () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log('Token source changed. Rebuilding...');
      runBuildQueue().catch((error) => {
        console.error('Rebuild failed:', error);
      });
    }, WATCH_DEBOUNCE_MS);
  });
}
