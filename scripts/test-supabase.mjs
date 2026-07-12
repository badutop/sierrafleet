// Quick standalone connectivity check for the Supabase project.
// Usage: node scripts/test-supabase.mjs
//
// Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env.local (or .env),
// since this runs outside Vite and doesn't have access to import.meta.env.

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function loadEnvFile(filename) {
	const filePath = path.join(rootDir, filename);
	if (!existsSync(filePath)) return;
	const content = readFileSync(filePath, 'utf-8');
	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eqIndex = trimmed.indexOf('=');
		if (eqIndex === -1) continue;
		const key = trimmed.slice(0, eqIndex).trim();
		let value = trimmed.slice(eqIndex + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (!(key in process.env)) process.env[key] = value;
	}
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	console.error(
		'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n' +
		'Copy .env.example to .env.local and fill in your Supabase project credentials.'
	);
	process.exit(1);
}

console.log(`Connecting to ${supabaseUrl} ...`);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const { data, error } = await supabase.from('vehicles').select('id').limit(1);

if (error) {
	console.error('❌ Query failed:', error.message);
	console.error(error);
	process.exit(1);
}

console.log('✅ Connection OK. Sample result from "vehicles":', data);
