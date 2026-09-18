#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function run(command, argumentsList) {
	console.log(`\nverify: ${command} ${argumentsList.join(' ')}`);
	const result = spawnSync(command, argumentsList, {
		stdio: 'inherit',
		encoding: 'utf8',
	});
	if (result.status !== 0) {
		throw new Error(`${command} ${argumentsList.join(' ')} failed with exit code ${result.status ?? 'unknown'}`);
	}
}

try {
	run(process.execPath, ['scripts/prepare-main-source.mjs', '--refresh']);
	for (const script of [
		'test:docs',
		'check:translations',
		'check:docs',
		'check',
		'build',
		'check:links',
	]) {
		run(pnpm, [script]);
	}
	console.log('\nverify: all website and upstream-source checks passed');
} catch (error) {
	console.error(`\nverify: ${error.message}`);
	process.exitCode = 1;
}
