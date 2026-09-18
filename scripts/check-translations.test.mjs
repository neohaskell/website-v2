import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import {
  EXPECTED_CANONICAL_COUNT,
  LOCALES,
  canonicalPaths,
  checkLandingTranslations,
  checkTranslations,
  readLandingSourceMarker,
  readSourceMarker,
  sourceSha,
  stampContents,
  stampLandingContents,
} from './check-translations.mjs';

function temporaryFixture() {
  return mkdtempSync(join(tmpdir(), 'neo-translation-sync-'));
}

function writeFixtureFile(root, path, contents) {
  const target = join(root, path);
  mkdirSync(resolve(target, '..'), { recursive: true });
  writeFileSync(target, contents, 'utf8');
}

function sourceFixture(root) {
  const sources = {
    'adrs/index.mdx': '---\ntitle: ADRs\n---\nEnglish ADR index.\n',
    'build/page.md': '---\ntitle: Build\n---\nEnglish build page.\n',
    'nested/topic.mdx': '---\ntitle: Topic\n---\nEnglish nested topic.\n',
  };
  writeFixtureFile(root, 'docs/index.mdx', '---\ntitle: Landing\n---\nHand-maintained landing.\n');
  writeFixtureFile(root, 'adrs/generated.md', '---\ntitle: Generated\n---\nGenerated ADR detail.\n');
  for (const [path, contents] of Object.entries(sources)) writeFixtureFile(root, path, contents);
  return sources;
}

function validTranslations(root, sources) {
  for (const locale of LOCALES) {
    writeFixtureFile(root, `${locale}/index.mdx`, '---\ntitle: Local home\n---\nMaintained separately.\n');
    writeFixtureFile(root, `${locale}/docs/index.mdx`, '---\ntitle: Local docs landing\n---\nMaintained separately.\n');
    for (const [path, contents] of Object.entries(sources)) {
      const translation = `---\ntitle: ${locale}\n---\nTexte ${locale} pour ${path}; not English.\n`;
      const syntax = path.endsWith('.mdx') ? 'mdx' : 'markdown';
      writeFixtureFile(root, `${locale}/${path}`, stampContents(translation, sourceSha(contents), syntax));
    }
  }
}

test('repository inventory has 49 pages and keeps only the tracked ADR index', () => {
  const root = resolve(import.meta.dirname, '..', 'src', 'content', 'docs');
  const paths = canonicalPaths(root);
  assert.equal(paths.length, EXPECTED_CANONICAL_COUNT);
  assert.ok(paths.includes('adrs/index.mdx'));
  assert.ok(!paths.includes('docs/index.mdx'));
  assert.ok(!paths.some(path => path.startsWith('adrs/') && path.endsWith('.md')));
  assert.ok(!paths.some(path => LOCALES.some(locale => path.startsWith(`${locale}/`))));
});

test('translated prose may differ completely when paths and markers are current', () => {
  const root = temporaryFixture();
  try {
    const sources = sourceFixture(root);
    validTranslations(root, sources);
    const report = checkTranslations({ docsRoot: root, expectedCount: 3 });
    assert.deepEqual(report.errors, []);
    assert.equal(readSourceMarker(readFileSync(join(root, 'es', 'build', 'page.md'), 'utf8')).hash,
      sourceSha(sources['build/page.md']));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('landing translations are checked against the TypeScript source revision', () => {
  const root = temporaryFixture();
  try {
    const source = 'export const landingContent = { headline: [\'Source\', \'landing\'] };\n';
    writeFixtureFile(root, 'src/data/landing.ts', source);
    for (const locale of LOCALES) {
      const translation = `export const landingContent = { headline: ['${locale}', 'landing'] };\n`;
      writeFixtureFile(
        root,
        `src/data/landing-locales/${locale}.ts`,
        stampLandingContents(translation, sourceSha(source)),
      );
    }

    const report = checkLandingTranslations({ websiteRoot: root });
    assert.deepEqual(report.errors, []);
    assert.equal(report.locales.length, LOCALES.length);
    assert.equal(
      readLandingSourceMarker(readFileSync(join(root, 'src/data/landing-locales/es.ts'), 'utf8')).hash,
      sourceSha(source),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('missing, extra, stale, and unmarked translations are reported separately', () => {
  const root = temporaryFixture();
  try {
    const sources = sourceFixture(root);
    validTranslations(root, sources);
    rmSync(join(root, 'fr', 'build', 'page.md'));
    writeFixtureFile(root, 'fr/extra.md', '---\ntitle: Extra\n---\nExtra translation.\n');
    writeFixtureFile(root, 'fr/adrs/generated.md', '---\ntitle: Generated\n---\nGenerated detail translation.\n');
    writeFixtureFile(root, 'ja/nested/topic.mdx', '---\ntitle: Topic\n---\n日本語.\n');
    const report = checkTranslations({ docsRoot: root, expectedCount: 3 });
    assert.ok(report.errors.some(error => error.kind === 'missing' && error.locale === 'fr' && error.path === 'build/page.md'));
    assert.ok(report.errors.some(error => error.kind === 'extra' && error.locale === 'fr' && error.path === 'extra.md'));
    assert.ok(report.errors.some(error => error.kind === 'extra' && error.locale === 'fr' && error.path === 'adrs/generated.md'));
    assert.ok(report.errors.some(error => error.kind === 'stale' && error.locale === 'ja' && error.path === 'nested/topic.mdx'));

    writeFixtureFile(root, 'ru/build/page.md', '---\ntitle: Build\n---\nРусский текст без marker.\n');
    const secondReport = checkTranslations({ docsRoot: root, expectedCount: 3 });
    assert.ok(secondReport.errors.some(error => error.kind === 'stale' && error.locale === 'ru' && error.path === 'build/page.md'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('stamping changes only the source marker and is idempotent', () => {
  const source = '---\ntitle: Source\n---\nEnglish source.\n';
  const original = '---\ntitle: Traduction\n---\nTexte traduit; preserve this body.\n';
  const hash = sourceSha(source);
  const stamped = stampContents(original, hash);
  assert.equal(readSourceMarker(stamped).hash, hash);
  assert.equal(stamped.replace(`<!-- translation-source-sha256: ${hash} -->\n`, ''), original);
  assert.equal(stampContents(stamped, hash), stamped);
  const bodyMarker = `${original}<!-- translation-source-sha256: ${'f'.repeat(64)} -->\n`;
  const bodyMarkerStamped = stampContents(bodyMarker, hash);
  assert.equal(readSourceMarker(bodyMarkerStamped).hash, hash);
  assert.ok(bodyMarkerStamped.includes('Texte traduit; preserve this body.'));
  assert.throws(() => stampContents('No frontmatter.', hash), /without frontmatter/);
});
