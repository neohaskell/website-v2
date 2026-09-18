#!/usr/bin/env node
// Deterministic documentation translation inventory and source-fingerprint gate.
//
// The checker compares paths and source SHA markers only. It never compares
// translated prose with English prose.

import { createHash } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEBSITE_ROOT = resolve(HERE, '..');
const DOCS_ROOT = resolve(WEBSITE_ROOT, 'src', 'content', 'docs');

export const LOCALES = Object.freeze(['es', 'fr', 'hy', 'ja', 'ru']);
export const EXPECTED_CANONICAL_COUNT = 49;
export const SOURCE_LANDING_PATH = 'docs/index.mdx';
export const LOCALE_LANDING_PATHS = Object.freeze(['index.mdx', 'docs/index.mdx']);
export const LANDING_SOURCE_PATH = 'src/data/landing.ts';
export const LANDING_LOCALE_DIRECTORY = 'src/data/landing-locales';
export const MARKER_PREFIX = 'translation-source-sha256';

const EXTENSION_RE = /\.(?:md|mdx)$/;
const HEX_SHA256_RE = /^[0-9a-f]{64}$/;
const MARKER_RE = new RegExp(`^<!-- ${MARKER_PREFIX}: ([0-9a-f]{64}) -->$`);
const MDX_MARKER_RE = new RegExp(`^\\{/\\* ${MARKER_PREFIX}: ([0-9a-f]{64}) \\*/\\}$`);
const LOCALE_SET = new Set(LOCALES);

/** SHA-256 over the exact UTF-8 bytes read from an English source file. */
export function sourceSha(contents) {
  return createHash('sha256').update(contents).digest('hex');
}

function compareNames(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedEntries(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .toSorted((left, right) => compareNames(left.name, right.name));
}

function collectMarkdownPaths(directory, prefix = '') {
  if (!existsSync(directory)) return [];
  const paths = [];
  for (const entry of sortedEntries(directory)) {
    const entryPath = resolve(directory, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      paths.push(...collectMarkdownPaths(entryPath, relativePath));
    } else if (entry.isFile() && EXTENSION_RE.test(entry.name)) {
      paths.push(relativePath.replaceAll(sep, '/'));
    }
  }
  return paths;
}

function isGeneratedAdrDetail(path) {
  return path.startsWith('adrs/') && path.endsWith('.md');
}

/**
 * Collect the English translation inventory relative to src/content/docs.
 *
 * docs/index.mdx is the hand-maintained documentation landing page, not one of
 * the 49 synchronized learning/reference pages. adrs/index.mdx is tracked and
 * therefore remains canonical; generated adrs/*.md detail pages do not.
 */
export function canonicalPaths(docsRoot = DOCS_ROOT) {
  return collectMarkdownPaths(docsRoot)
    .filter(path => !LOCALE_SET.has(path.split('/')[0]))
    .filter(path => path !== SOURCE_LANDING_PATH)
    .filter(path => !isGeneratedAdrDetail(path));
}

function managedLocalePaths(localeRoot) {
  // Each locale has separately maintained home pages at <locale>/index.mdx and
  // <locale>/docs/index.mdx. They are outside the synchronized 49-page
  // inventory and are intentionally not reported as extra translations.
  return collectMarkdownPaths(localeRoot).filter(path => !LOCALE_LANDING_PATHS.includes(path));
}

function repositoryRelative(path, root) {
  return relative(root, path).split(sep).join('/');
}

function frontmatterEnd(contents) {
  const lines = contents.split(/\r?\n/);
  if (lines[0] !== '---') return null;
  const closingIndex = lines.findIndex((line, index) => index > 0 && line === '---');
  if (closingIndex < 0) return null;
  return { lines, closingIndex };
}

/**
 * Read the marker immediately following frontmatter. A missing marker is a
 * stale translation because its source revision is not attestable.
 */
export function readSourceMarker(contents, syntax = 'markdown') {
  const parsed = frontmatterEnd(contents);
  if (!parsed) return { hash: null, reason: 'missing frontmatter' };

  const { lines, closingIndex } = parsed;
  const markerIndex = lines.findIndex(
    (line, index) => index > closingIndex && line.trim() !== '',
  );
  if (markerIndex < 0) return { hash: null, reason: 'missing source SHA marker' };

  const pattern = syntax === 'mdx' ? MDX_MARKER_RE : MARKER_RE;
  const marker = pattern.exec(lines[markerIndex].trim());
  if (!marker) return { hash: null, reason: 'missing source SHA marker' };
  return { hash: marker[1], reason: null };
}

function markerLine(hash, syntax = 'markdown') {
  if (!HEX_SHA256_RE.test(hash)) throw new Error(`invalid source SHA-256: ${hash}`);
  if (syntax === 'mdx') return `{/* ${MARKER_PREFIX}: ${hash} */}`;
  return `<!-- ${MARKER_PREFIX}: ${hash} -->`;
}

function isSourceMarker(line) {
  const candidate = line.trim();
  return MARKER_RE.test(candidate) || MDX_MARKER_RE.test(candidate);
}

/**
 * Replace or insert only the source marker. Translated prose and all other
 * bytes remain unchanged; the operation refuses a document without YAML
 * frontmatter so it cannot silently put the marker in an arbitrary location.
 */
export function stampContents(contents, hash, syntax = 'markdown') {
  const parsed = frontmatterEnd(contents);
  if (!parsed) throw new Error('cannot stamp translation without frontmatter');

  const { lines, closingIndex } = parsed;
  const line = markerLine(hash, syntax);
  const markerIndexes = [];
  for (let index = closingIndex + 1; index < lines.length; index += 1) {
    if (isSourceMarker(lines[index])) markerIndexes.push(index);
  }
  const newline = contents.includes('\r\n') ? '\r\n' : '\n';
  for (const index of markerIndexes.toReversed()) lines.splice(index, 1);
  lines.splice(closingIndex + 1, 0, line);
  return lines.join(newline);
}

const LANDING_MARKER_RE = new RegExp(`^// ${MARKER_PREFIX}: ([0-9a-f]{64})$`);

export function readLandingSourceMarker(contents) {
  const marker = contents
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => LANDING_MARKER_RE.test(line));
  if (!marker) return { hash: null, reason: 'missing source SHA marker' };
  return { hash: LANDING_MARKER_RE.exec(marker)[1], reason: null };
}

/**
 * Replace or insert only the source marker in a TypeScript landing translation.
 * The marker is a comment on the first line so it cannot alter imports or data.
 */
export function stampLandingContents(contents, hash) {
  if (!HEX_SHA256_RE.test(hash)) throw new Error(`invalid source SHA-256: ${hash}`);
  const line = `// ${MARKER_PREFIX}: ${hash}`;
  const newline = contents.includes('\r\n') ? '\r\n' : '\n';
  const lines = contents
    .split(/\r?\n/)
    .filter(candidate => !LANDING_MARKER_RE.test(candidate.trim()));
  lines.unshift(line);
  return lines.join(newline);
}

function inspectTranslation(translation, expectedHash, syntax = 'markdown') {
  const marker = readSourceMarker(translation, syntax);
  if (!marker.hash) return { stale: true, reason: marker.reason };
  if (marker.hash !== expectedHash) {
    return {
      stale: true,
      reason: `source SHA ${marker.hash} does not match ${expectedHash}`,
    };
  }
  return { stale: false, reason: null };
}

function sortedDifference(left, right) {
  const rightSet = new Set(right);
  return left.filter(path => !rightSet.has(path)).toSorted(compareNames);
}

function localeReport(locale, docsRoot, expectedPaths, sourceHashes) {
  const localeRoot = resolve(docsRoot, locale);
  const actualPaths = managedLocalePaths(localeRoot);
  const missing = sortedDifference(expectedPaths, actualPaths);
  const extra = sortedDifference(actualPaths, expectedPaths);
  const stale = [];

  for (const path of expectedPaths) {
    if (!actualPaths.includes(path)) continue;
    const translationPath = resolve(localeRoot, path);
    const contents = readFileSync(translationPath, 'utf8');
    const syntax = path.endsWith('.mdx') ? 'mdx' : 'markdown';
    const inspection = inspectTranslation(contents, sourceHashes[path], syntax);
    if (inspection.stale) stale.push({ path, reason: inspection.reason });
  }

  return { locale, missing, extra, stale: stale.toSorted((left, right) => compareNames(left.path, right.path)) };
}

function landingLocaleReport(locale, websiteRoot, expectedHash) {
  const path = resolve(websiteRoot, LANDING_LOCALE_DIRECTORY, `${locale}.ts`);
  if (!existsSync(path)) {
    return {
      locale,
      path: repositoryRelative(path, websiteRoot),
      missing: true,
      stale: false,
      reason: 'landing translation file is missing',
    };
  }

  const inspection = inspectLandingTranslation(readFileSync(path, 'utf8'), expectedHash);
  return {
    locale,
    path: repositoryRelative(path, websiteRoot),
    missing: false,
    stale: inspection.stale,
    reason: inspection.reason,
  };
}

export function checkLandingTranslations({ websiteRoot = WEBSITE_ROOT } = {}) {
  const sourcePath = resolve(websiteRoot, LANDING_SOURCE_PATH);
  if (!existsSync(sourcePath)) {
    return {
      sourceHash: null,
      locales: [],
      extra: [],
      errors: [{
        kind: 'landing-source-missing',
        path: repositoryRelative(sourcePath, websiteRoot),
        message: 'English landing source is missing',
      }],
    };
  }

  const sourceHash = sourceSha(readFileSync(sourcePath, 'utf8'));
  const localeDirectory = resolve(websiteRoot, LANDING_LOCALE_DIRECTORY);
  const actualFiles = existsSync(localeDirectory)
    ? readdirSync(localeDirectory, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.ts'))
      .map(entry => entry.name)
      .toSorted(compareNames)
    : [];
  const expectedFiles = LOCALES.map(locale => `${locale}.ts`);
  const extra = actualFiles.filter(path => !expectedFiles.includes(path));
  const locales = LOCALES.map(locale => landingLocaleReport(locale, websiteRoot, sourceHash));
  const errors = [];

  for (const report of locales) {
    if (report.missing) {
      errors.push({ kind: 'landing-missing', locale: report.locale, path: report.path });
    } else if (report.stale) {
      errors.push({ kind: 'landing-stale', locale: report.locale, path: report.path, reason: report.reason });
    }
  }
  for (const path of extra) errors.push({
    kind: 'landing-extra',
    path: repositoryRelative(resolve(localeDirectory, path), websiteRoot),
  });

  return { sourceHash, locales, extra, errors };
}

function inspectLandingTranslation(translation, expectedHash) {
  const marker = readLandingSourceMarker(translation);
  if (!marker.hash) return { stale: true, reason: marker.reason };
  if (marker.hash !== expectedHash) {
    return {
      stale: true,
      reason: `source SHA ${marker.hash} does not match ${expectedHash}`,
    };
  }
  return { stale: false, reason: null };
}

/**
 * Return deterministic inventory findings. `expectedCount` is injectable for
 * fixture tests; the repository contract is exactly 49 canonical pages.
 */
export function checkTranslations({
  docsRoot = DOCS_ROOT,
  websiteRoot = WEBSITE_ROOT,
  expectedCount = EXPECTED_CANONICAL_COUNT,
  includeLanding = docsRoot === DOCS_ROOT,
} = {}) {
  const expectedPaths = canonicalPaths(docsRoot);
  const sourceHashes = Object.fromEntries(
    expectedPaths.map(path => [path, sourceSha(readFileSync(resolve(docsRoot, path))) ]),
  );
  const errors = [];

  if (expectedPaths.length !== expectedCount) {
    errors.push({
      kind: 'source-count',
      count: expectedPaths.length,
      expected: expectedCount,
      message: `English canonical inventory has ${expectedPaths.length} pages; expected ${expectedCount}`,
    });
  }

  const locales = LOCALES.map(locale => localeReport(locale, docsRoot, expectedPaths, sourceHashes));
  for (const report of locales) {
    for (const path of report.missing) errors.push({ kind: 'missing', locale: report.locale, path });
    for (const path of report.extra) errors.push({ kind: 'extra', locale: report.locale, path });
    for (const item of report.stale) {
      errors.push({ kind: 'stale', locale: report.locale, path: item.path, reason: item.reason });
    }
  }

  const landing = includeLanding ? checkLandingTranslations({ websiteRoot }) : null;
  if (landing) errors.push(...landing.errors);

  return { expectedPaths, sourceHashes, locales, landing, errors };
}

function formatReport(report) {
  const lines = [`translation-sync: canonical English pages=${report.expectedPaths.length}`];
  for (const locale of report.locales) {
    const missing = locale.missing.length;
    const extra = locale.extra.length;
    const stale = locale.stale.length;
    if (!missing && !extra && !stale) {
      lines.push(`  ${locale.locale}: OK (${report.expectedPaths.length} pages)`);
      continue;
    }
    lines.push(`  ${locale.locale}: missing=${missing}, extra=${extra}, stale=${stale}`);
    if (missing) lines.push(`    missing: ${locale.missing.join(', ')}`);
    if (extra) lines.push(`    extra: ${locale.extra.join(', ')}`);
    for (const item of locale.stale) lines.push(`    stale: ${item.path} (${item.reason})`);
  }
  if (report.landing) {
    const missing = report.landing.locales.filter(locale => locale.missing).length;
    const stale = report.landing.locales.filter(locale => locale.stale).length;
    const extra = report.landing.extra.length;
    if (!missing && !extra && !stale && !report.landing.errors.length) {
      lines.push('  landing: OK (5 locales)');
    } else {
      lines.push(`  landing: missing=${missing}, extra=${extra}, stale=${stale}`);
      for (const locale of report.landing.locales) {
        if (locale.missing) lines.push(`    missing: ${locale.path}`);
        else if (locale.stale) lines.push(`    stale: ${locale.path} (${locale.reason})`);
      }
      for (const path of report.landing.extra) {
        lines.push(`    extra: ${LANDING_LOCALE_DIRECTORY}/${path}`);
      }
    }
  }
  if (report.errors.length) lines.unshift(`translation-sync: FAIL — ${report.errors.length} finding(s)`);
  else lines.unshift('translation-sync: OK');
  return lines.join('\n');
}

function checkCommand() {
  const report = checkTranslations();
  console.log(formatReport(report));
  return report.errors.length ? 1 : 0;
}

function resolveRequestedFile(requested) {
  const normalized = requested.replaceAll('\\', '/').replace(/^\.\//, '');
  const websiteRelative = normalized.startsWith('website/') ? normalized.slice('website/'.length) : normalized;
  const docsPrefix = 'src/content/docs/';
  if (websiteRelative.startsWith(docsPrefix)) return resolve(WEBSITE_ROOT, websiteRelative);
  if (websiteRelative.startsWith('src/')) return resolve(WEBSITE_ROOT, websiteRelative);
  return resolve(DOCS_ROOT, websiteRelative);
}

function stampFile(path, sourceHashes, expectedPaths, docsRoot) {
  const relativePath = repositoryRelative(path, docsRoot);
  if (!relativePath || !relativePath.includes('/')) throw new Error(`not a locale translation path: ${relativePath}`);
  const [locale, ...rest] = relativePath.split('/');
  const canonicalPath = rest.join('/');
  if (!LOCALE_SET.has(locale)) throw new Error(`unknown locale in path: ${relativePath}`);
  if (LOCALE_LANDING_PATHS.includes(canonicalPath)) throw new Error(`refusing to stamp locale landing page: ${relativePath}`);
  if (!expectedPaths.includes(canonicalPath)) throw new Error(`not a canonical translation path: ${relativePath}`);
  const contents = readFileSync(path, 'utf8');
  const syntax = canonicalPath.endsWith('.mdx') ? 'mdx' : 'markdown';
  const stamped = stampContents(contents, sourceHashes[canonicalPath], syntax);
  if (stamped !== contents) writeFileSync(path, stamped, 'utf8');
  return relativePath;
}

function stampLocale(locale, docsRoot, expectedPaths, sourceHashes) {
  if (!LOCALE_SET.has(locale)) throw new Error(`unknown locale: ${locale}`);
  const localeRoot = resolve(docsRoot, locale);
  const paths = managedLocalePaths(localeRoot);
  const changed = [];
  for (const path of paths) {
    changed.push(stampFile(resolve(localeRoot, path), sourceHashes, expectedPaths, docsRoot));
  }
  return changed;
}

function resolveRequestedLandingFile(requested) {
  const normalized = requested.replaceAll('\\', '/').replace(/^\.\//, '');
  const websiteRelative = normalized.startsWith('website/') ? normalized.slice('website/'.length) : normalized;
  const landingPrefix = `${LANDING_LOCALE_DIRECTORY}/`;
  if (websiteRelative.startsWith(landingPrefix)) return resolve(WEBSITE_ROOT, websiteRelative);
  return resolve(WEBSITE_ROOT, LANDING_LOCALE_DIRECTORY, websiteRelative);
}

function stampLandingFile(path, sourceHash, websiteRoot = WEBSITE_ROOT) {
  const localeDirectory = resolve(websiteRoot, LANDING_LOCALE_DIRECTORY);
  const relativePath = repositoryRelative(path, localeDirectory);
  const locale = relativePath.endsWith('.ts') ? relativePath.slice(0, -3) : '';
  if (!LOCALE_SET.has(locale)) throw new Error(`not a landing translation path: ${relativePath}`);
  const contents = readFileSync(path, 'utf8');
  const stamped = stampLandingContents(contents, sourceHash);
  if (stamped !== contents) writeFileSync(path, stamped, 'utf8');
  return relativePath;
}

function stampLandingLocale(locale, websiteRoot, sourceHash) {
  if (!LOCALE_SET.has(locale)) throw new Error(`unknown locale: ${locale}`);
  const path = resolve(websiteRoot, LANDING_LOCALE_DIRECTORY, `${locale}.ts`);
  if (!existsSync(path)) throw new Error(`landing translation file does not exist: ${locale}`);
  return stampLandingFile(path, sourceHash, websiteRoot);
}

function stampCommand(args) {
  const report = checkTranslations({ expectedCount: EXPECTED_CANONICAL_COUNT });
  const options = { locales: [], files: [], all: false, landing: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--all') options.all = true;
    else if (argument === '--landing') options.landing = true;
    else if (argument === '--locale') options.locales.push(args[++index] ?? '');
    else if (argument === '--file') options.files.push(args[++index] ?? '');
    else if (LOCALE_SET.has(argument)) options.locales.push(argument);
    else if (argument) options.files.push(argument);
  }
  if (options.all) options.locales = [...LOCALES];
  if (!options.locales.length && !options.files.length) {
    throw new Error('stamp requires a locale, --locale <locale>, --file <path>, or --all');
  }

  if (options.landing) {
    const landing = checkLandingTranslations();
    if (!landing.sourceHash) throw new Error('English landing source is missing');
    const changed = [];
    for (const locale of [...new Set(options.locales)]) {
      changed.push(stampLandingLocale(locale, WEBSITE_ROOT, landing.sourceHash));
    }
    for (const requested of options.files) {
      const path = resolveRequestedLandingFile(requested);
      if (!existsSync(path)) throw new Error(`landing translation file does not exist: ${requested}`);
      changed.push(stampLandingFile(path, landing.sourceHash));
    }
    console.log(`translation-sync: stamped ${changed.length} landing translation file(s)`);
    return 0;
  }

  const changed = [];
  for (const locale of [...new Set(options.locales)]) {
    changed.push(...stampLocale(locale, DOCS_ROOT, report.expectedPaths, report.sourceHashes));
  }
  for (const requested of options.files) {
    const path = resolveRequestedFile(requested);
    if (!existsSync(path)) throw new Error(`translation file does not exist: ${requested}`);
    changed.push(stampFile(path, report.sourceHashes, report.expectedPaths, DOCS_ROOT));
  }
  console.log(`translation-sync: stamped ${changed.length} translation file(s)`);
  return 0;
}

function selfTest() {
  const source = '---\ntitle: Source\n---\nEnglish source.\n';
  const translated = '---\ntitle: Traducción\n---\n<!-- translated prose is intentionally different -->\nTexto traducido.\n';
  const hash = sourceSha(source);
  assert.equal(readSourceMarker(translated).hash, null);
  const stamped = stampContents(translated, hash);
  assert.equal(readSourceMarker(stamped).hash, hash);
  assert.ok(stamped.includes('Texto traducido.'));
  assert.ok(!stamped.includes('English source.'));
  assert.equal(stampContents(stamped, hash), stamped);
  assert.equal(inspectTranslation(stamped, hash).stale, false);
  assert.equal(inspectTranslation(stamped, sourceSha('changed')).stale, true);
  assert.equal(readSourceMarker('Texto sin frontmatter').reason, 'missing frontmatter');
  assert.throws(() => stampContents('Texto sin frontmatter', hash), /without frontmatter/);

  const crlf = '---\r\ntitle: Traduction\r\n---\r\nCorps.\r\n';
  const stampedCrlf = stampContents(crlf, hash);
  assert.ok(stampedCrlf.includes('\r\n'));
  assert.equal(readSourceMarker(stampedCrlf).hash, hash);
  const mdxStamped = stampContents(translated, hash, 'mdx');
  assert.equal(readSourceMarker(mdxStamped, 'mdx').hash, hash);
  assert.ok(mdxStamped.includes(`{/* ${MARKER_PREFIX}: ${hash} */}`));

  const landingSource = 'export const landingContent = { headline: [\'Source\', \'landing\'] };\n';
  const landingTranslation = 'import type { LandingContent } from \'../landing\';\n\nexport const landingContent = { headline: [\'Traducción\', \'landing\'] };\n';
  const landingHash = sourceSha(landingSource);
  assert.equal(readLandingSourceMarker(landingTranslation).hash, null);
  const stampedLanding = stampLandingContents(landingTranslation, landingHash);
  assert.equal(readLandingSourceMarker(stampedLanding).hash, landingHash);
  assert.ok(stampedLanding.includes('Traducción'));
  assert.equal(stampLandingContents(stampedLanding, landingHash), stampedLanding);
  assert.equal(inspectLandingTranslation(stampedLanding, landingHash).stale, false);
  assert.equal(inspectLandingTranslation(stampedLanding, sourceSha('changed')).stale, true);

  console.log('translation-sync: self-test OK (docs and landing markers, stale, prose, frontmatter, CRLF assertions passed)');
  return 0;
}

function usage() {
  return 'usage: check-translations.mjs [--check|--self-test|--stamp <locale>|--stamp --all|--stamp --landing --all|--stamp --file <path>]';
}

function main(argv) {
  const [mode, ...args] = argv;
  if (mode === '--self-test') return selfTest();
  if (!mode || mode === '--check') return checkCommand();
  if (mode === '--stamp' || mode === '--update') return stampCommand(args);
  if (mode === '--help' || mode === '-h') {
    console.log(usage());
    return 0;
  }
  console.error(usage());
  return 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (error) {
    console.error(`translation-sync: FAIL — ${error.message}`);
    process.exit(1);
  }
}
