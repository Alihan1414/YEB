#!/usr/bin/env node
/**
 * Vercel env vars güncelleyici - Tüm Firebase env'leri vision-b1ad5'e günceller
 * Kullanım: node scripts/set_vercel_env.js
 */

const { execSync } = require('child_process');

const vars = [
  ['NEXT_PUBLIC_FIREBASE_API_KEY',            'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw'],
  ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',        'vision-b1ad5.firebaseapp.com'],
  ['NEXT_PUBLIC_FIREBASE_DATABASE_URL',       'https://vision-b1ad5-default-rtdb.firebaseio.com'],
  ['NEXT_PUBLIC_FIREBASE_PROJECT_ID',         'vision-b1ad5'],
  ['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',     'vision-b1ad5.firebasestorage.app'],
  ['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID','121963731187'],
  ['NEXT_PUBLIC_FIREBASE_APP_ID',             '1:121963731187:web:b79298734352c2d452bf86'],
  ['NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',     'G-32J8MVDDQT'],
];

const environments = ['production', 'preview', 'development'];

for (const [key, value] of vars) {
  // Remove existing first (ignore errors if not found)
  for (const env of environments) {
    try {
      execSync(`echo y | npx vercel env rm ${key} ${env} 2>&1`, { stdio: 'pipe' });
    } catch {}
  }

  // Add new value
  for (const env of environments) {
    try {
      // Use printf to pipe the value (avoid interactive prompt)
      const cmd = `echo ${JSON.stringify(value)} | npx vercel env add ${key} ${env}`;
      execSync(cmd, { stdio: 'pipe' });
      console.log(`✅ Set ${key} = ${value.substring(0, 20)}... [${env}]`);
    } catch (e) {
      console.warn(`⚠️  ${key} [${env}]: ${e.message?.split('\n')[0]}`);
    }
  }
}

console.log('\n🚀 Triggering new deployment...');
try {
  const out = execSync('npx vercel --prod 2>&1', { stdio: 'pipe' }).toString();
  console.log('✅ Deployment output:\n', out.split('\n').slice(-5).join('\n'));
} catch (e) {
  console.warn('⚠️  Deploy trigger failed, push a commit to trigger it.\n', e.message?.split('\n')[0]);
}
