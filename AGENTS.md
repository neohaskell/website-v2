# NeoHaskell website-v2 agent guide

## Start here: repository and ownership

Work in **`~/Work/NeoHaskell/website-v2`**, the independent public repository
<https://github.com/neohaskell/website-v2> (Git remote:
`git@github.com:neohaskell/website-v2.git`). The public site is neohaskell.org.
All paths and commands below are relative to this repository, not the old
NeoHaskell monorepo's `website/` directory.

This Astro 7/Starlight repository owns the landing page, human documentation,
translations, examples, diagrams, screenshots, website skills, and website CI.
Implementation code and canonical ADR records remain in
<https://github.com/neohaskell/NeoHaskell>. Do not copy that repository's source
or governance wholesale, restore the removed monorepo website, or use its
`./dev` commands for website work. Its Haskell implementation pipeline is not
the website workflow. The Neo CLI's bundled IDE is also upstream; this site
shows screenshots of it, not its application code.

1. Read `README.md`; inspect `git status --short` and the current branch.
2. Use a task branch and preserve unrelated work. Do not commit or push unless
   requested. Migration publication is not ongoing permission to push to main.
3. Use Node 24 (CI version; package minimum is 22.12), pnpm 11.5.3, Git, Python 3,
   and network access to the public upstream repository.
4. Install and prepare the source evidence before development:

   ```sh
   cd ~/Work/NeoHaskell/website-v2
   pnpm install --frozen-lockfile
   pnpm prepare:source
   pnpm dev
   ```

## Latest-main source boundary: local and CI use the same script

`pnpm prepare:source` runs `scripts/prepare-main-source.mjs --refresh`.
`scripts/main-source.mjs` defines the repository, ref, and cache paths:

- Repository: `https://github.com/neohaskell/NeoHaskell.git`; ref: `main`.
- Checkout: ignored `.source/neohaskell-main/`.
- Metadata: ignored `.source/main.json` records repository, ref, and exact SHA.

On first use the script shallow-clones main with blob filtering. On later runs
it fetches main and **hard-resets the disposable cache to FETCH_HEAD**. Never
edit or store work inside `.source/`; refreshing overwrites tracked changes.
This does not pull, reset, or modify the website checkout or a user's separate
NeoHaskell checkout. Do not substitute a local feature branch for upstream main.

`pnpm check:source` checks the existing snapshot and metadata without fetching.
It does **not** prove the remote has no newer commit. The `predev`, `precheck`,
and `prebuild` hooks require an existing snapshot, not a fresh network fetch.
Use `pnpm prepare:source` explicitly when beginning work and `pnpm verify` for
final verification. If fetching fails, report the failure; do not silently
claim cached evidence is latest main.

`pnpm verify` invokes the same refresh script first, then runs `test:docs`,
`check:translations`, `check:docs`, `check`, `build`, and `check:links`, stopping
on failure. `.github/workflows/docs.yml` installs dependencies and runs this
same command on PRs and main pushes. Do not create a separate CI-only source
fetch process.

### When new main makes evidence stale

`documentation-manifest.json` records reviewed sources, exact hashes, excerpts,
and page evidence. `scripts/check-docs.mjs` resolves website-local evidence
here and implementation evidence against `.source/neohaskell-main/`.

1. Record the fetched SHA from `.source/main.json` and inspect the changed
   upstream sources and every affected page's claims.
2. Update prose, excerpts, examples, and review records as needed before
   changing manifest hashes. Hash refresh alone is not semantic review.
3. If a source moved or disappeared, establish its replacement and validate
   the claim; do not drop evidence merely to make a gate green.
4. Update affected translations after reviewing the English changes.

See `DOCUMENTATION_PLAN.md` and `DOCUMENTATION_REVIEW.md` for the authoring and
honest-evidence contract. Website checks do not compile NeoHaskell examples,
run Hurl/PostgreSQL, or prove business correctness. Report those limits.

## File map

| Work | Entry points |
|---|---|
| Landing copy and structure | `src/data/landing.ts`, `src/components/LandingPage.astro` |
| Landing routes and locales | `src/pages/index.astro`, `src/pages/[lang]/`, `src/data/landing-locales/{es,fr,hy,ja,ru}.ts` |
| Landing appearance | `src/styles/landing.css`, `src/styles/brand.css` |
| Docs shell, sidebar, branding | `astro.config.mjs`, `src/styles/docs-theme.css`, `src/styles/diagrams.css` |
| English docs and docs homepage | `src/content/docs/`, `src/content/docs/docs/index.mdx` |
| Localized docs | `src/content/docs/{es,fr,hy,ja,ru}/` |
| Evidence and checks | `documentation-manifest.json`, `scripts/check-docs.mjs` |
| ADR generation | `scripts/generate-adrs.mjs`, `scripts/adr-index-check` |
| Example downloads | `examples/`, `fixtures/`, `scripts/generate-examples.mjs`, `public/examples/` |
| Visual assets | `public/diagrams/`, `public/screenshots/` |
| Translation infrastructure | `scripts/check-translations.mjs`, its tests, `.github/workflows/translate.yml` |

### Generated assets and ADRs

Never commit `.source/`, `dist/`, `.astro/`, `node_modules/`, or generated
`src/content/docs/adrs/*.md` detail pages. Canonical ADRs belong upstream, not
here. The tracked `src/content/docs/adrs/index.mdx` is generated: after a source
refresh, run `pnpm generate:adrs`, review its diff, and update localized indexes
if needed. `pnpm check:docs` checks ADR-index consistency and tracked landing
page drift before documentation evidence. Do not hand-edit the English index.

Build hooks regenerate downloadable examples. Keep editable Draw.io files next
to exported SVGs; update registered evidence after inspecting changed assets.

## Translation workflow

Read `.agents/skills/neohaskell-translation-sync/SKILL.md` for every English
content or translation change. English is canonical; supported locales are
Spanish `es`, French `fr`, Armenian `hy`, Japanese `ja`, and Russian `ru`.

- The migration baseline has 49 synchronized English docs and 245 translated
  copies, plus five TypeScript landing translations. The checker determines
  the inventory; do not assume an old count after adding pages.
- `adrs/index.mdx` participates; generated ADR detail pages do not. English
  `docs/index.mdx` and locale `index.mdx` / `docs/index.mdx` are hand-maintained
  homepages outside synchronization: update and inspect them separately.
- Review translations, preserve code/identifiers/anchors/MDX structure, and use
  locale-prefixed documentation links. Then stamp only reviewed files.
- **MDX markers must use `{/* translation-source-sha256: HASH */}`**, not raw
  HTML comments (which previously broke builds). Markdown uses HTML comments;
  landing TypeScript uses a first-line `// translation-source-sha256: HASH`.
  The checker handles these formats; use it rather than writing markers by hand.
- Markers prove the reviewed source revision, not translation quality. Never
  mass-stamp stale translations merely to silence the checker.

```sh
pnpm exec node scripts/check-translations.mjs --stamp --file src/content/docs/fr/build/queries.md
pnpm exec node scripts/check-translations.mjs --stamp --landing --file src/data/landing-locales/fr.ts
pnpm test:translations
pnpm check:translations
```

## Established design direction: preserve unless explicitly changed

The landing page leads with the real Neo IDE screenshot, not AI messaging or
an explanation that NeoHaskell is a Haskell dialect. The approved headline is
**“Know what your software does. Explain why it did it.”** Its four outcomes are
“See the facts behind the current state.”, “Give the team one model to discuss.”,
“Make the important decisions visible before code.”, and “Make the next change
small enough to check.” Keep the page concrete and uncluttered: no decorative
numbering, arrows, status ornaments, or unsupported speed/correctness promises.

AI agents are implementation help; people decide whether business rules are
right. Compiler and tests provide evidence only for what they check. Do not
turn the earlier speculative two-day-product idea into a product claim.

The initial brief requested a “NeoHaskell” hero eyebrow, but it was later
removed and remains absent. Treat that as an unresolved brief discrepancy,
not permission to silently restore it or claim it was approved away.

Docs use Starlight's existing search, grouped sidebar, theme/language controls,
and mobile menu. Prefer configuration and shared CSS over a custom shell.
Maintain the neutral paper-stack reading surface and coherent navy-charcoal
dark mode across article, desk, sidebar, TOC, search, code, and buttons. Docs
headings use local font fallbacks; landing headings use Inter. Keep primary
buttons readable: Starlight markdown-link specificity previously made their
text purple on purple.

## Visual QA and preview

A visual critique requires fresh screenshots, not only source inspection.
After layout changes inspect both light/dark docs and affected landing locales
at desktop (1440px) and phone (390px), plus narrow/zoom layouts. The prior
200%-zoom stress check used a 195px CSS viewport; preserve wrapping and no
horizontal document overflow, including Armenian text and open language menus.

Check all six landing routes (`/`, `/es/`, `/fr/`, `/hy/`, `/ja/`, `/ru/`):
correct language, six selector choices, one current marker, localized docs
links, IDE visibility, keyboard focus, Escape closure, and focus restoration.
The IDE popover focus transfer previously took about 200ms: wait for the close
control to receive focus before asserting Escape behavior. Preserve reduced
motion and visible focus. For the Starlight mobile menu inspect the host's
`aria-expanded` and sidebar visibility, not only the nested button attribute.

Keep the requested Tailscale preview at
**http://corthan.tail78a30.ts.net:4321/** (docs: `/docs/`). To serve a built site:

```sh
pnpm build
pnpm exec astro preview --host 0.0.0.0 --port 4321 --allowed-hosts corthan.tail78a30.ts.net
```

Use a persistent terminal for the server. Do not assume an old process still
serves this checkout. Inspect a port conflict before stopping a process; Astro
may otherwise silently choose 4322. Verify the hostname itself returns 200 for
both `/` and `/docs/`; an IP-only check misses allowed-host failures. Do not use
`pnpm dev -- --host ...` (the extra `--` previously broke argument forwarding).

## Completion and migration handoff

Run `pnpm verify` and `git diff --check` before claiming completion; run visual
QA for UI changes and translation tests for synchronization changes. Report
which checks ran, the source SHA, and any warnings/blockers. CI/build success
is not proof that production deployment or DNS has been configured.

At migration, the complete verification passed and built 769 pages. Those are
historical results, not evidence for a new change. The non-fatal Astro warning
`Entry docs → 404 was not found.` remained unresolved; investigate rather than
claiming a warning-free build. Older monorepo builds also had localized-root
route conflicts; check current build output before treating those as current.

The website was published independently. Cleanup in the original monorepo's
`blue-crab` worktree remained uncommitted at handoff, and old criteria in
`docs/changes/013-human-documentation.md` and `015-core-derive-markers.md` still
referenced removed website scripts. That is separate upstream follow-up, not a
reason to reintroduce the monorepo dependency. Recheck its state before acting.
