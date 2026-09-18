import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = resolve(fileURLToPath(new URL('.', import.meta.url)));

export const WEBSITE_ROOT = resolve(HERE, '..');
export const SOURCE_CACHE_ROOT = join(WEBSITE_ROOT, '.source');
export const SOURCE_ROOT = join(SOURCE_CACHE_ROOT, 'neohaskell-main');
export const SOURCE_REPOSITORY = 'https://github.com/neohaskell/NeoHaskell.git';
export const SOURCE_REF = 'main';

export function requireMainSource() {
	const decisionsIndex = join(SOURCE_ROOT, 'docs', 'decisions', 'README.md');
	if (!existsSync(join(SOURCE_ROOT, '.git')) || !existsSync(decisionsIndex)) {
		throw new Error(
			`NeoHaskell source snapshot is missing at ${SOURCE_ROOT}. Run ` +
			'`pnpm prepare:source` before running website checks.',
		);
	}
	return SOURCE_ROOT;
}
