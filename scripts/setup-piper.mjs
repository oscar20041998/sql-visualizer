// Downloads the Piper voices used by local read-aloud into models/piper/.
//
//   npm run setup:piper
//
// What lands on disk: one ONNX voice per UI language (~60 MB each) plus the shared espeak-ng
// phoneme data (~17 MB) they are pronounced with. The runtime itself is the sherpa-onnx-node
// package from npm, so nothing here needs a compiler — only these assets, which are too large to
// commit.
//
// Everything is pulled from Hugging Face rather than the piper GitHub releases: the standalone
// piper binaries are GitHub-only, and plenty of corporate networks block github.com while allowing
// huggingface.co and the npm registry.
//
// Re-running is safe: files already on disk at a plausible size are left alone.
import { createWriteStream } from 'node:fs';
import { mkdir, rename, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(ROOT, 'models', 'piper');
const HF = 'https://huggingface.co';

/**
 * Voice per UI locale, both at "medium" quality: the x_low variants are a third of the size but
 * noticeably choppy over the long sentences an explanation produces.
 *
 * These repos are the sherpa-onnx packaging of the rhasspy/piper voices — same VITS weights, plus
 * the tokens.txt and espeak-ng-data that the phonemizer needs.
 */
const VOICES = [
  {
    locale: 'vi',
    name: 'vi_VN-vais1000-medium',
    repo: 'csukuangfj/vits-piper-vi_VN-vais1000-medium',
  },
  { locale: 'en', name: 'en_US-lessac-medium', repo: 'csukuangfj/vits-piper-en_US-lessac-medium' },
];

/** espeak data is identical in every voice repo, so it is fetched once from the first of them. */
const ESPEAK_SOURCE_REPO = VOICES[0].repo;
const ESPEAK_DIR = 'espeak-ng-data';

/** Hugging Face rate-limits aggressive parallelism, and 12 is already ~30× faster than serial. */
const CONCURRENCY = 12;

function human(bytes) {
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

async function sizeOf(path) {
  try {
    return (await stat(path)).size;
  } catch {
    return 0;
  }
}

/** Downloads one file unless a plausible copy is already there. Returns bytes actually fetched. */
async function download(url, destination, { minBytes = 1, label } = {}) {
  if ((await sizeOf(destination)) >= minBytes) return 0;

  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status} fetching ${url}`);

  await mkdir(dirname(destination), { recursive: true });
  // Written to .partial first so an interrupted run cannot leave a truncated file that the size
  // check above would then accept as complete.
  const partial = `${destination}.partial`;
  await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));
  await rename(partial, destination);

  const size = await sizeOf(destination);
  if (label) console.log(`  ↓ ${label} (${human(size)})`);
  return size;
}

async function listRepoFiles(repo) {
  const response = await fetch(`${HF}/api/models/${repo}?blobs=true`);
  if (!response.ok) throw new Error(`HTTP ${response.status} listing ${repo}`);
  const payload = await response.json();
  return (payload.siblings ?? []).map((file) => ({ path: file.rfilename, size: file.size ?? 0 }));
}

/** Runs `worker` over `items` with a fixed number of workers, failing on the first error. */
async function mapPool(items, worker) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    let item;
    while ((item = queue.shift()) !== undefined) await worker(item);
  });
  await Promise.all(workers);
}

async function fetchEspeakData() {
  const files = (await listRepoFiles(ESPEAK_SOURCE_REPO)).filter((file) =>
    file.path.startsWith(`${ESPEAK_DIR}/`)
  );
  if (!files.length) throw new Error(`${ESPEAK_SOURCE_REPO} has no ${ESPEAK_DIR}/ directory`);

  const total = files.reduce((sum, file) => sum + file.size, 0);
  let missing = 0;
  for (const file of files) {
    if (!(await sizeOf(join(TARGET, file.path)))) missing += 1;
  }
  if (!missing) {
    console.log(`  ✓ ${ESPEAK_DIR} already present (${files.length} files, ${human(total)})`);
    return;
  }

  console.log(`  ↓ ${ESPEAK_DIR}: ${missing} of ${files.length} files (${human(total)}) …`);
  let done = 0;
  await mapPool(files, async (file) => {
    await download(
      `${HF}/${ESPEAK_SOURCE_REPO}/resolve/main/${file.path}`,
      join(TARGET, file.path)
    );
    done += 1;
    if (done % 50 === 0) process.stdout.write(`    ${done}/${files.length}\n`);
  });
  console.log(`    ${files.length}/${files.length} done`);
}

async function fetchVoice(voice) {
  const directory = join(TARGET, 'voices', voice.name);
  // Renamed to a fixed set of names so the engine does not have to know which voice it loaded.
  const files = [
    { remote: `${voice.name}.onnx`, local: 'model.onnx', minBytes: 1_000_000 },
    { remote: `${voice.name}.onnx.json`, local: 'model.onnx.json' },
    { remote: 'tokens.txt', local: 'tokens.txt' },
  ];

  let fetched = 0;
  for (const file of files) {
    fetched += await download(
      `${HF}/${voice.repo}/resolve/main/${file.remote}`,
      join(directory, file.local),
      {
        minBytes: file.minBytes,
        label: `${voice.name}/${file.local}`,
      }
    );
  }
  if (!fetched) console.log(`  ✓ ${voice.name} already present`);
}

async function main() {
  console.log(`Piper voices → ${TARGET.replace(ROOT, '.')}`);
  await mkdir(TARGET, { recursive: true });

  await fetchEspeakData();
  for (const voice of VOICES) await fetchVoice(voice);

  console.log(
    [
      '',
      'Ready. Local read-aloud is the default; to be explicit add this to .env and restart the dev server:',
      '',
      '  AI_SPEECH_PROVIDER=piper',
      '',
      'Override the paths with PIPER_VOICE_VI / PIPER_VOICE_EN / PIPER_ESPEAK_DATA if you move them.',
    ].join('\n')
  );
}

main().catch((error) => {
  console.error(`\nsetup-piper failed: ${error.message}`);
  process.exit(1);
});
