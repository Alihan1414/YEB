/**
 * Vercel Environment Variables Updater
 * Uses Vercel REST API to update environment variables for vision-b1ad5 Firebase project
 */
const https = require('https');

// ============================================================
// READ THIS FIRST:
// Run: npx vercel whoami  to confirm you're logged in
// Then: npx vercel link   to link this project to Vercel
// Then: node scripts/update_vercel_env.js <VERCEL_TOKEN>
// Get token from: https://vercel.com/account/tokens
// ============================================================

const VERCEL_TOKEN = process.argv[2];
if (!VERCEL_TOKEN) {
  console.error('Usage: node scripts/update_vercel_env.js <VERCEL_TOKEN>');
  process.exit(1);
}

const NEW_ENV_VARS = {
  NEXT_PUBLIC_FIREBASE_API_KEY:            'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:        'vision-b1ad5.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_DATABASE_URL:       'https://vision-b1ad5-default-rtdb.firebaseio.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID:         'vision-b1ad5',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:     'vision-b1ad5.firebasestorage.app',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:'121963731187',
  NEXT_PUBLIC_FIREBASE_APP_ID:             '1:121963731187:web:b79298734352c2d452bf86',
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:     'G-32J8MVDDQT',
};

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  // 1. Find the project
  console.log('🔍 Fetching Vercel projects...');
  const projects = await apiRequest('GET', '/v9/projects');
  if (projects.status !== 200) {
    console.error('❌ Failed to fetch projects. Check your token.', projects.body);
    process.exit(1);
  }

  const project = (projects.body.projects || []).find(p =>
    p.name === 'student-reports' ||
    p.name === 'studentreports' ||
    (p.link && p.link.repoSlug && p.link.repoSlug.toLowerCase().includes('yeb'))
  );

  if (!project) {
    console.log('Available projects:', (projects.body.projects || []).map(p => p.name));
    console.error('❌ Could not find student-reports project. Check project name above.');
    process.exit(1);
  }

  console.log(`✅ Found project: ${project.name} (${project.id})`);
  const projectId = project.id;

  // 2. Get existing env vars
  const existing = await apiRequest('GET', `/v9/projects/${projectId}/env`);
  const existingEnvs = existing.body.envs || [];

  // 3. Update or create each env var
  for (const [key, value] of Object.entries(NEW_ENV_VARS)) {
    const existingEnv = existingEnvs.find(e => e.key === key);

    if (existingEnv) {
      // Update existing
      const res = await apiRequest('PATCH', `/v9/projects/${projectId}/env/${existingEnv.id}`, {
        value,
        target: ['production', 'preview', 'development'],
      });
      if (res.status === 200) {
        console.log(`✅ Updated: ${key}`);
      } else {
        console.warn(`⚠️  Failed to update ${key}:`, res.body);
      }
    } else {
      // Create new
      const res = await apiRequest('POST', `/v9/projects/${projectId}/env`, [{
        key,
        value,
        type: 'plain',
        target: ['production', 'preview', 'development'],
      }]);
      if (res.status === 200 || res.status === 201) {
        console.log(`🆕 Created: ${key}`);
      } else {
        console.warn(`⚠️  Failed to create ${key}:`, res.body);
      }
    }
  }

  // 4. Trigger a new deployment
  console.log('\n🚀 Triggering new deployment...');
  const deploy = await apiRequest('POST', `/v13/deployments`, {
    name: project.name,
    gitSource: {
      type: 'github',
      repoId: project.link?.repoId,
      ref: 'main',
    },
  });

  if (deploy.status === 200 || deploy.status === 201) {
    console.log(`✅ Deployment triggered! URL: https://${deploy.body.url}`);
  } else {
    console.log('ℹ️  Manual redeploy needed: push a commit or go to Vercel dashboard.');
  }

  console.log('\n🎉 All done! Vercel will use vision-b1ad5 Firebase project from now on.');
}

main().catch(console.error);
