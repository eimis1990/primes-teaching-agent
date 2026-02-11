#!/usr/bin/env node

/**
 * Apply Migration Script
 * Runs the 015_fix_infinite_recursion.sql migration against Supabase
 * 
 * Usage: node apply-migration.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Read environment variables from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      env[key] = value;
    }
  });
  
  return env;
}

async function executeSQL(supabaseUrl, serviceKey, sql) {
  return new Promise((resolve, reject) => {
    // Extract project ref from URL
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
    
    const options = {
      hostname: `${projectRef}.supabase.co`,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({ sql_query: sql }));
    req.end();
  });
}

async function applyMigration() {
  try {
    console.log('📖 Reading environment and migration file...');
    
    const env = loadEnv();
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials in .env.local');
    }

    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '015_fix_infinite_recursion.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Applying migration to Supabase...');
    console.log('   This may take a few seconds...\n');
    
    try {
      await executeSQL(supabaseUrl, supabaseServiceKey, sql);
      console.log('✅ Migration applied successfully!');
      console.log('✨ The infinite recursion error should now be fixed.');
      console.log('🔄 Please refresh your browser to see the changes.\n');
    } catch (apiError) {
      throw new Error('Could not apply migration via API');
    }
    
  } catch (err) {
    console.error('❌ Automatic migration failed:', err.message);
    console.log('\n📋 Please apply the migration manually instead:\n');
    console.log('1. Open your Supabase Dashboard SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/bltbmfxcqxiwfbsjojlk/sql/new\n');
    console.log('2. Copy the contents of:');
    console.log('   supabase/migrations/015_fix_infinite_recursion.sql\n');
    console.log('3. Paste into the SQL Editor and click "Run"\n');
    console.log('4. Refresh your browser\n');
    console.log('✨ The migration will fix the infinite recursion error in your RLS policies.\n');
    console.log('📄 See APPLY_FIX_NOW.md for detailed instructions.\n');
  }
}

applyMigration();
