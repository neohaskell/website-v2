# NeoHaskell Website

The public NeoHaskell website and documentation site:
[neohaskell.org](https://neohaskell.org). It is built with
[Astro Starlight](https://starlight.astro.build/).

The repository owns the landing page, human documentation, five translated
locales, diagrams, IDE screenshots, downloadable examples, and their CI. The
NeoHaskell implementation source remains in
[`neohaskell/NeoHaskell`](https://github.com/neohaskell/NeoHaskell).

## Prerequisites

- Node.js `>=22.12.0`
- pnpm `11.5.3` (pinned in `package.json`)
- Git and network access to the public NeoHaskell repository

## Develop

```sh
pnpm install
pnpm prepare:source
pnpm dev
```

Open [localhost:4321](http://localhost:4321).

The source preparation command fetches the latest `main` commit from
`neohaskell/NeoHaskell` into ignored `.source/neohaskell-main/`. ADR generation
and documentation evidence checks read that snapshot locally.

## Verify

Run the complete website gate:

```sh
pnpm verify
```

This refreshes the upstream source snapshot and runs:

```sh
pnpm test:docs
pnpm check:translations
pnpm check:docs
pnpm check
pnpm build
pnpm check:links
```

`check:docs` validates the ADR index, page inventory, editorial evidence,
source hashes, examples, diagrams, screenshots, and local links. It does not
compile NeoHaskell, run Hurl, or start PostgreSQL.

## Content layout

| Path | Content |
|---|---|
| `src/content/docs/` | English documentation |
| `src/content/docs/{es,fr,hy,ja,ru}/` | Localized documentation |
| `src/data/landing.ts` | English marketing content |
| `src/data/landing-locales/` | Localized marketing content |
| `src/pages/` | English and localized landing routes |
| `src/styles/` | Brand, landing, docs, and diagram styles |
| `examples/` | Source files for downloadable project checkpoints |
| `public/diagrams/` | Editable Draw.io sources and exported SVGs |
| `public/screenshots/` | Neo IDE screenshots |

The canonical translation inventory contains 49 English pages and 245 translated
pages. Translation source revisions are checked with:

```sh
pnpm test:translations
pnpm check:translations
```

## ADRs and upstream evidence

The website does not vendor the main repository's implementation code or ADR
records. `scripts/prepare-main-source.mjs` fetches the latest main commit into
`.source/`; `scripts/generate-adrs.mjs` renders the ADR pages from that snapshot.
The tracked ADR index is checked against the fetched records before the docs
verification gate passes.

The documentation manifest records public source hashes and reviewed excerpts.
Website-local sources use this repository; implementation evidence uses the
latest fetched main snapshot.

## CI

- `.github/workflows/docs.yml` runs `pnpm verify` on pull requests and `main`.
- `.github/workflows/translate.yml` translates changed English pages, preserves
  syntax and links, stamps source revisions, and verifies every locale.

The translation synchronization skill is in
`.agents/skills/neohaskell-translation-sync/SKILL.md`.

## License

See [LICENSE](LICENSE).
