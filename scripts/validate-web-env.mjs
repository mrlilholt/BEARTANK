#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const releaseMode = args.includes('--release');
const requireEnvFile = args.includes('--require-env-file');
const envFileArgIndex = args.indexOf('--env-file');
const envFilePath =
  envFileArgIndex >= 0 && args[envFileArgIndex + 1]
    ? path.resolve(process.cwd(), args[envFileArgIndex + 1])
    : path.join(repoRoot, 'apps', 'web', '.env');

const REQUIRED_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_SUPER_ADMIN_EMAILS',
  'VITE_CLASS_CODE'
];

function parseDotEnv(fileContents) {
  const values = {};
  const lines = fileContents.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const envFromFile = fs.existsSync(envFilePath)
  ? parseDotEnv(fs.readFileSync(envFilePath, 'utf8'))
  : {};

if (!fs.existsSync(envFilePath) && requireEnvFile) {
  console.error(`[env:check] Missing env file: ${envFilePath}`);
  process.exit(1);
}

if (!fs.existsSync(envFilePath) && !requireEnvFile) {
  console.warn(`[env:check] Env file not found at ${envFilePath}; using process environment only.`);
}
const env = {
  ...envFromFile,
  ...Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.startsWith('VITE_'))
  )
};

const missingKeys = REQUIRED_KEYS.filter((key) => !String(env[key] || '').trim());
if (missingKeys.length > 0) {
  console.error(
    `[env:check] Missing required variables (${missingKeys.length}): ${missingKeys.join(', ')}`
  );
  process.exit(1);
}

const superAdminEmails = String(env.VITE_SUPER_ADMIN_EMAILS || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

if (superAdminEmails.length === 0) {
  console.error('[env:check] VITE_SUPER_ADMIN_EMAILS must include at least one email.');
  process.exit(1);
}

const invalidSuperAdminEmails = superAdminEmails.filter(
  (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
);
if (invalidSuperAdminEmails.length > 0) {
  console.error(
    `[env:check] Invalid email(s) in VITE_SUPER_ADMIN_EMAILS: ${invalidSuperAdminEmails.join(', ')}`
  );
  process.exit(1);
}

const warnings = [];
const projectId = String(env.VITE_FIREBASE_PROJECT_ID || '').trim();
const authDomain = String(env.VITE_FIREBASE_AUTH_DOMAIN || '').trim();
if (projectId && authDomain && !authDomain.includes(projectId)) {
  warnings.push(
    `VITE_FIREBASE_AUTH_DOMAIN does not include VITE_FIREBASE_PROJECT_ID (${projectId}).`
  );
}

const storageBucket = String(env.VITE_FIREBASE_STORAGE_BUCKET || '').trim();
if (projectId && storageBucket && !storageBucket.includes(projectId)) {
  warnings.push(
    `VITE_FIREBASE_STORAGE_BUCKET does not include VITE_FIREBASE_PROJECT_ID (${projectId}).`
  );
}

if (releaseMode) {
  const firebaseRcPath = path.join(repoRoot, '.firebaserc');
  if (!fs.existsSync(firebaseRcPath)) {
    console.error('[env:check] Missing .firebaserc required for release checks.');
    process.exit(1);
  }

  const firebaseRc = JSON.parse(fs.readFileSync(firebaseRcPath, 'utf8'));
  const aliases = firebaseRc.projects || {};
  const projectAlias = process.env.FIREBASE_PROJECT_ALIAS || 'staging';
  if (!aliases[projectAlias]) {
    console.error(
      `[env:check] FIREBASE_PROJECT_ALIAS="${projectAlias}" not found in .firebaserc projects.`
    );
    process.exit(1);
  }
}

if (warnings.length > 0) {
  for (const warning of warnings) {
    console.warn(`[env:check] Warning: ${warning}`);
  }
}

console.log(
  `[env:check] OK (${releaseMode ? 'release' : 'local'} mode) with ${superAdminEmails.length} super admin email(s).`
);
