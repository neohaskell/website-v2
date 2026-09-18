---
name: neohaskell-translation-sync
description: Keep the five NeoHaskell website locales aligned with the 49-page English documentation inventory and TypeScript landing source using path checks and deterministic source SHA markers, without comparing translated prose.
---

# Translation synchronization

Use this skill when adding or reviewing a website documentation translation, when
English documentation changes, or when the translation workflow changes. The
synchronization gate checks **inventory and source revision**, not translation
quality or prose similarity.

## Canonical inventory

English sources are Markdown and MDX files below
`src/content/docs/`, relative to that directory:

- Exclude locale directories: `es/`, `fr/`, `hy/`, `ja/`, and `ru/`.
- Exclude generated ADR detail pages: `adrs/*.md`.
- Include the tracked ADR landing page: `adrs/index.mdx`.
- Keep the hand-maintained documentation landing page `docs/index.mdx` out of
  the synchronized inventory. It is a landing file, not one of the 49 pages.

The resulting inventory is exactly **49 canonical relative paths**. A locale
translation is stored at the same relative path below its locale directory:

```text
src/content/docs/build/commands-and-events.md
src/content/docs/es/build/commands-and-events.md
```

The locale home pages at `src/content/docs/<locale>/index.mdx` and
`src/content/docs/<locale>/docs/index.mdx` are also hand-maintained
landing files and are outside this inventory. Other `.md` and `.mdx` files below
a locale are reported as extra translations.

The marketing landing page is a separate TypeScript source:

```text
src/data/landing.ts
src/data/landing-locales/es.ts
src/data/landing-locales/fr.ts
src/data/landing-locales/hy.ts
src/data/landing-locales/ja.ts
src/data/landing-locales/ru.ts
```

The checker requires one locale module for each language and a source marker for
the exact `landing.ts` bytes. The Astro routes `/`, `/es/`, `/fr/`, `/hy/`,
`/ja/`, and `/ru/` render these six landing pages.

## Source marker contract

Every synchronized Markdown/MDX translation gets this HTML comment immediately
after its frontmatter:

```html
<!-- translation-source-sha256: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef -->
```

Each TypeScript landing translation gets the equivalent first-line comment:

```ts
// translation-source-sha256: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

The value is SHA-256 over the exact bytes of the corresponding English source
file. A missing marker, malformed marker, or marker for an older English file
is stale. The checker never compares translated prose, titles, links, code, or
MDX/TypeScript structure with the English source.

When translating, preserve the document contract:

- Keep frontmatter delimiters and keys, Markdown/MDX structure, and component
  tags/attributes valid.
- Keep internal link destinations, URL fragments, code fences, code spans,
  imports, and other code syntax unchanged.
- Translate human-readable prose, headings, and descriptions only.
- Do not translate generated ADR detail pages. The tracked ADR index is a
  normal canonical page and is translated.

## Commands

Run from the repository root:

```sh
pnpm check:translations
pnpm test:translations
```

From the repository root, the equivalent package commands are:

```sh
pnpm run test:translations
pnpm run check:translations
```

After a translation is reviewed, stamp only its source marker. The command
changes marker comments and refuses a file without frontmatter or a path outside
the canonical inventory; it does not rewrite translated prose:

```sh
pnpm exec node scripts/check-translations.mjs --stamp --locale es
pnpm exec node scripts/check-translations.mjs --stamp --landing --all
pnpm exec node scripts/check-translations.mjs --stamp --file src/content/docs/fr/build/queries.md
pnpm exec node scripts/check-translations.mjs --stamp --landing --file src/data/landing-locales/fr.ts
```

`--stamp --all` updates Markdown/MDX markers in existing files for all five
locales. `--stamp --landing --all` updates the five TypeScript landing markers.
Neither command creates missing pages, deletes extra files, or makes an
incomplete inventory pass. Run `--check` afterward; missing, extra, and stale
findings remain errors.

## Review sequence

1. Add or update the English documentation page or `src/data/landing.ts`.
2. Translate the same relative documentation path, or update every
   `src/data/landing-locales/<locale>.ts` module, preserving links and
   syntax.
3. Review the translation itself, then stamp its exact English source SHA with
   the Markdown or `--landing` command as appropriate.
4. Run `pnpm check:translations` and
   `pnpm run test:translations`.
5. Do not commit or push generated ADR detail pages or unrelated locale content
   as part of synchronization.

A source edit intentionally makes its translations stale until they are
retranslated and stamped. A marker update alone is not evidence that prose was
reviewed; it only records which English revision the translator handled.
