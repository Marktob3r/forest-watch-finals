import fs from 'fs';
import path from 'path';
import process from 'process';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DATA_PATH = path.resolve(process.cwd(), 'data', 'users.json');

async function main() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error('No users.json found at', DATA_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  const users = JSON.parse(raw || '[]');

  // Quick check: ensure the target table exists (helpful error if not)
  try {
    const { error: checkError } = await supabase.from('users').select('id').limit(1);
    if (checkError) {
      // Common message when table missing: "Could not find the table 'public.users' in the schema cache"
      if (String(checkError.message || '').toLowerCase().includes('could not find') || String(checkError.message || '').toLowerCase().includes('table')) {
        console.error('\nError: the target table `public.users` was not found in your Supabase database.');
        console.error('Supabase returned:', checkError.message || checkError);
        console.error('\nYou can create the table with this SQL (run in Supabase SQL editor):\n');
        console.error(`-- Create users table\nCREATE TABLE IF NOT EXISTS public.users (\n  id uuid PRIMARY KEY,\n  name text,\n  email text UNIQUE NOT NULL,\n  password_hash text,\n  salt text,\n  role text,\n  organization text,\n  location text,\n  created_at timestamptz,\n  reports_submitted integer DEFAULT 0,\n  alerts_received integer DEFAULT 0,\n  projects_followed integer DEFAULT 0,\n  notifications jsonb DEFAULT '{}'::jsonb,\n  verified boolean DEFAULT false,\n  verification_code text,\n  verification_expires bigint,\n  achievements jsonb DEFAULT '[]'::jsonb\n);\n`);
        console.error('After creating the table, re-run this import script.');
        process.exit(1);
      }
    }
  } catch (err) {
    // If the check itself threw, surface the message and exit
    console.error('Failed to check for target table `public.users`:', err && err.message ? err.message : err);
    process.exit(1);
  }

  console.log(`Found ${users.length} users — starting import.`);

  for (const u of users) {
    const payload = {
      id: u.id,
      name: u.name || null,
      email: u.email || null,
      password_hash: u.passwordHash || null,
      salt: u.salt || null,
      role: u.role || 'user',
      organization: u.organization || null,
      location: u.location || null,
      created_at: u.createdAt || null,
      reports_submitted: u.reportsSubmitted ?? 0,
      alerts_received: u.alertsReceived ?? 0,
      projects_followed: u.projectsFollowed ?? 0,
      notifications: u.notifications || {},
      verified: !!u.verified,
      verification_code: u.verificationCode || null,
      verification_expires: u.verificationExpires || null,
      achievements: u.achievements || [],
    };

    const { data, error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('Failed upsert for', u.email, error.message || error);
    } else {
      console.log('Upserted', u.email);
    }
  }

  console.log('Import completed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
