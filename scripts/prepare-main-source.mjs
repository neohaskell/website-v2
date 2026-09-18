#!/usr/bin/env node

import {
	mkdirSync,
	existsSync,
	readFileSync,
	rmSync,
	writeFileSync,
	mkdtempSync,
	renameSync,
} from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
	SOURCE_CACHE_ROOT,
	SOURCE_REF,
	SOURCE_REPOSITORY,
	SOURCE_ROOT,
} from './main-source.mjs';

const METADATA_PATH = join(SOURCE_CACHE_ROOT, 'main.json');

function runGit(argumentsList, cwd) {
	const result = spawnSync('git', argumentsList, {
		cwd,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	if (result.status !== 0) {
		const detail = (result.stderr || result.stdout || '').trim();
		throw new Error(`git ${argumentsList.join(' ')} failed${detail ? `: ${detail}` : ''}`);
	}
	return result.stdout.trim();
}

function sourceCommit() {
	return runGit(['rev-parse', 'HEAD'], SOURCE_ROOT);
}

function writeMetadata(commit) {
	writeFileSync(
		METADATA_PATH,
		`${JSON.stringify({ repository: SOURCE_REPOSITORY, ref: SOURCE_REF, commit }, null, 2)}\n`,
		'utf8',
	);
}

function cloneFresh() {
	mkdirSync(SOURCE_CACHE_ROOT, { recursive: true });
	const temporaryRoot = mkdtempSync(join(SOURCE_CACHE_ROOT, 'clone-'));
	rmSync(temporaryRoot, { recursive: true, force: true });
	try {
		runGit([
			'clone',
			'--depth',
			'1',
			'--filter=blob:none',
			'--branch',
			SOURCE_REF,
			'--single-branch',
			SOURCE_REPOSITORY,
			temporaryRoot,
		], undefined);
		if (existsSync(SOURCE_ROOT)) rmSync(SOURCE_ROOT, { recursive: true, force: true });
		renameSync(temporaryRoot, SOURCE_ROOT);
	} catch (error) {
		rmSync(temporaryRoot, { recursive: true, force: true });
		throw error;
	}
}

function refresh() {
	mkdirSync(SOURCE_CACHE_ROOT, { recursive: true });
	if (existsSync(join(SOURCE_ROOT, '.git'))) {
		runGit(['remote', 'set-url', 'origin', SOURCE_REPOSITORY], SOURCE_ROOT);
		runGit(['fetch', '--depth', '1', 'origin', SOURCE_REF], SOURCE_ROOT);
		runGit(['reset', '--hard', 'FETCH_HEAD'], SOURCE_ROOT);
	} else {
		cloneFresh();
	}
	const commit = sourceCommit();
	writeMetadata(commit);
	console.log(`source: ${SOURCE_REPOSITORY} ${SOURCE_REF} at ${commit}`);
}

function check() {
	if (!existsSync(join(SOURCE_ROOT, '.git')) || !existsSync(join(SOURCE_ROOT, 'docs', 'decisions', 'README.md'))) {
		throw new Error(`source snapshot missing at ${SOURCE_ROOT}; run pnpm prepare:source`);
	}
	const metadata = JSON.parse(readFileSync(METADATA_PATH, 'utf8'));
	const commit = sourceCommit();
	if (metadata.commit !== commit || metadata.repository !== SOURCE_REPOSITORY || metadata.ref !== SOURCE_REF) {
		throw new Error(`source snapshot metadata is stale at ${METADATA_PATH}; run pnpm prepare:source`);
	}
	console.log(`source: using ${SOURCE_REF} at ${commit}`);
}

const mode = process.argv[2];
try {
	if (mode === '--refresh') refresh();
	else if (mode === '--check') check();
	else {
		console.error('usage: node scripts/prepare-main-source.mjs --refresh|--check');
		process.exitCode = 2;
	}
} catch (error) {
	console.error(`source: ${error.message}`);
	process.exitCode = 1;
}
