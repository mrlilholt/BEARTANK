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

function readEnv(key) {
  const value = import.meta.env[key];
  if (typeof value !== 'string') return '';
  return value.trim();
}

const missingKeys = REQUIRED_KEYS.filter((key) => !readEnv(key));

if (missingKeys.length > 0) {
  throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`);
}

const parsedSuperAdminEmails = readEnv('VITE_SUPER_ADMIN_EMAILS')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

if (parsedSuperAdminEmails.length === 0) {
  throw new Error('VITE_SUPER_ADMIN_EMAILS must contain at least one email.');
}

export const firebaseConfig = {
  apiKey: readEnv('VITE_FIREBASE_API_KEY'),
  authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readEnv('VITE_FIREBASE_APP_ID'),
  measurementId: readEnv('VITE_FIREBASE_MEASUREMENT_ID') || undefined
};

export const superAdminEmails = parsedSuperAdminEmails;
export const classCode = readEnv('VITE_CLASS_CODE');
