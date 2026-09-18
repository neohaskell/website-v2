# NeoHaskell website-v2 agent guide

This repository is the standalone Astro/Starlight website for NeoHaskell.
It owns the public landing page, human documentation, translations, examples,
assets, and website CI. NeoHaskell implementation code remains in the main
`neohaskell/NeoHaskell` repository.

## Required verification

The documentation evidence gate reads the latest `main` commit of the main
repository through an ignored `.source/` snapshot. Run this before declaring a
change complete:

```sh
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm verify` refreshes the upstream snapshot, validates ADRs and documentation
source evidence, checks translations, runs Astro validation, builds the site,
and checks rendered links.

For focused work:

```sh
pnpm prepare:source       # fetch latest neohaskell/NeoHaskell main
pnpm test:docs
pnpm check:translations
pnpm check:docs
pnpm check
pnpm build
pnpm check:links
```

## Boundaries

- Never commit `.source/`, `dist/`, `.astro/`, `node_modules/`, or generated
  `src/content/docs/adrs/*.md` detail pages.
- `src/content/docs/adrs/index.mdx` is generated from the upstream ADR index;
  regenerate it with `pnpm generate:adrs` after refreshing the source snapshot.
- Keep Draw.io sources beside their exported SVGs.
- Translation source-SHA markers record the reviewed English revision; a marker
  update is not a substitute for reviewing changed prose.
- Do not copy NeoHaskell implementation files into this repository. The source
  preparation script is the CI/local dependency boundary.
