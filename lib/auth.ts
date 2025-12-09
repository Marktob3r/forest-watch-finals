import crypto from 'crypto';
import { getServiceSupabase } from '@/lib/supabase';

// Helper to map DB row -> internal user shape used by the app
function mapDbToUser(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || '',
    email: (row.email || '').toLowerCase(),
    passwordHash: row.password_hash || null,
    salt: row.salt || null,
    role: row.role || 'user',
    organization: row.organization || '',
    location: row.location || '',
      recommendations: row.recommendations || [],
    profileImageUrl: row.profile_image_url || null,
    profileImagePath: row.profile_image_path || null,
    createdAt: row.created_at || null,
    reportsSubmitted: row.reports_submitted ?? 0,
    alertsReceived: row.alerts_received ?? 0,
    projectsFollowed: row.projects_followed ?? 0,
    notifications: row.notifications || { emailAlerts: false, criticalOnly: false, weeklyReport: false, projectUpdates: false },
    verified: !!row.verified,
    verificationCode: row.verification_code ?? null,
    verificationExpires: row.verification_expires ?? null,
    reset_code: row.reset_code ?? null,
    reset_expires: row.reset_expires ?? null,
    achievements: row.achievements || [],
  };
}

export function hashPassword(password: string, salt?: string) {
  const usedSalt = salt ?? crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return { salt: usedSalt, hash: derived };
}

export function verifyPassword(password: string, salt: string, hash: string) {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
}

const AUTH_SECRET = process.env.AUTH_SECRET || 'dev_secret_change_me';

export function createToken(payload: Record<string, any>, expiresInSec = 60 * 60 * 24 * 7) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expiresInSec;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string) {
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return null;
    const expected = crypto.createHmac('sha256', AUTH_SECRET).update(`${header}.${body}`).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}
export async function createUser(user: { name?: string; email: string; passwordHash: string; salt: string; role?: string; organization?: string; location?: string }) {
  const supabase = getServiceSupabase();
  const id = crypto.randomUUID();
  const row = {
    id,
    name: user.name || '',
    email: user.email.toLowerCase(),
    password_hash: user.passwordHash,
    salt: user.salt,
    role: user.role || 'user',
    organization: user.organization || '',
    location: user.location || '',
    created_at: new Date().toISOString(),
    reports_submitted: 0,
    alerts_received: 0,
    projects_followed: 0,
    notifications: { emailAlerts: false, criticalOnly: false, weeklyReport: false, projectUpdates: false },
    verified: false,
    verification_code: null,
    verification_expires: null,
  };

  const { data, error } = await supabase.from('users').insert(row).select().single();
  if (error) throw error;
  // after creating the user, award the 'new_member' achievement in the canonical table
  try {
    // best-effort: award the new_member achievement; do not fail user creation if this errors
    // call the exported helper which will insert into user_achievements and ensure master record exists
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    await awardAchievementToUser(id, 'new_member');
  } catch (e) {
    // swallow errors here — user creation already succeeded
    console.warn('awardAchievementToUser failed during createUser', e);
  }

  return mapDbToUser(data);
}

export async function generateVerificationCodeForUser(email: string, ttlMs = 15 * 60 * 1000) {
  const supabase = getServiceSupabase();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + ttlMs;

  const { data, error } = await supabase.from('users').update({ verification_code: code, verification_expires: expires, verified: false }).eq('email', email.toLowerCase()).select().limit(1).single();
  if (error) return null;
  return { code, expires };
}

export async function generatePasswordResetCodeForUser(email: string, ttlMs = 15 * 60 * 1000) {
  const supabase = getServiceSupabase();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + ttlMs;

  const { data, error } = await supabase.from('users').update({ reset_code: code, reset_expires: expires }).eq('email', email.toLowerCase()).select().limit(1).single();
  if (error) return null;
  return { code, expires };
}

export async function verifyResetCode(email: string, code: string) {
  const supabase = getServiceSupabase();
  const { data: userRow, error: fetchErr } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).limit(1).maybeSingle();
  if (fetchErr || !userRow) return { ok: false, reason: 'not_found' };
  const user = mapDbToUser(userRow as any);
  if (!user) return { ok: false, reason: 'not_found' };
  if (!user.reset_code || !user.reset_expires) return { ok: false, reason: 'no_code' };
  if (Date.now() > Number(user.reset_expires)) return { ok: false, reason: 'expired' };
  if (String(user.reset_code) !== String(code)) return { ok: false, reason: 'mismatch' };

  return { ok: true, user };
}

export async function resetPasswordWithCode(email: string, code: string, newPassword: string) {
  const supabase = getServiceSupabase();
  const verify = await verifyResetCode(email, code);
  if (!verify.ok) return { ok: false, reason: verify.reason };

  const { salt, hash } = hashPassword(newPassword);
  const { data, error } = await supabase.from('users').update({ password_hash: hash, salt, reset_code: null, reset_expires: null }).eq('email', email.toLowerCase()).select().limit(1).single();
  if (error) return { ok: false, reason: 'update_failed' };
  return { ok: true, user: mapDbToUser(data) };
}

export async function verifyUserByCode(email: string, code: string) {
  const supabase = getServiceSupabase();
  const { data: userRow, error: fetchErr } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).limit(1).maybeSingle();
  if (fetchErr || !userRow) return { ok: false, reason: 'not_found' };
  const user = mapDbToUser(userRow as any);
  if (!user) return { ok: false, reason: 'not_found' };
  if (!user.verificationCode || !user.verificationExpires) return { ok: false, reason: 'no_code' };
  if (Date.now() > Number(user.verificationExpires)) return { ok: false, reason: 'expired' };
  if (String(user.verificationCode) !== String(code)) return { ok: false, reason: 'mismatch' };

  const { data, error } = await supabase.from('users').update({ verified: true, verification_code: null, verification_expires: null }).eq('id', user.id).select().single();
  if (error) return { ok: false, reason: 'update_failed' };
  return { ok: true, user: mapDbToUser(data) };
}

export async function awardAchievementToUser(userId: string, achievementId: string, achievedAt?: string) {
  const supabase = getServiceSupabase();

  // Check if user already has this achievement
  try {
    const { data: exists, error: existsErr } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .limit(1)
      .maybeSingle();
    if (existsErr) return { ok: false, reason: 'db_error' };
    if (exists) return { ok: false, reason: 'already_awarded' };

    // Ensure the canonical achievement exists in the master table
    const { data: achRow } = await supabase.from('achievements').select('id').eq('id', achievementId).limit(1).maybeSingle();
    if (!achRow) {
      // Insert a minimal definition so the master list contains the id
      // Title is set to the id as a fallback; admins can refine later
      await supabase.from('achievements').insert({ id: achievementId, title: achievementId }).select();
    }

    // Insert into user_achievements (id will default via DB gen_random_uuid())
    const record = {
      user_id: userId,
      achievement_id: achievementId,
      awarded_at: achievedAt ? new Date(achievedAt).toISOString() : new Date().toISOString(),
      metadata: {}
    } as any;

    const { data: inserted, error: insertErr } = await supabase.from('user_achievements').insert(record).select().single();
    if (insertErr) return { ok: false, reason: 'insert_failed' };
    return { ok: true, achievement: inserted };
  } catch (e) {
    return { ok: false, reason: 'exception' };
  }
}

export async function getUserAchievements(userId: string) {
  const supabase = getServiceSupabase();
  try {
    // Join user_achievements with achievements to enrich the result
    const { data, error } = await supabase
      .from('user_achievements')
      .select('achievement_id, awarded_at, metadata, achievements (id, title, description, icon, points)')
      .eq('user_id', userId)
      .order('awarded_at', { ascending: false });
    if (error || !data) return [];

    // Map to legacy-friendly shape used in the app
    return (data as any[]).map((row) => ({
      id: row.achievement_id,
      achievedAt: row.awarded_at,
      title: row.achievements?.title || null,
      description: row.achievements?.description || null,
      icon: row.achievements?.icon || null,
      metadata: row.metadata || null
    }));
  } catch (e) {
    return [];
  }
}

export async function findUserByEmail(email: string) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).limit(1).maybeSingle();
  if (error || !data) return null;
  return mapDbToUser(data);
}

export async function findUserById(id: string) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.from('users').select('*').eq('id', id).limit(1).maybeSingle();
  if (error || !data) return null;
  return mapDbToUser(data);
}

export async function updateUserById(id: string, updates: Record<string, any>) {
  const supabase = getServiceSupabase();
  // Map update keys from camelCase to snake_case expected in DB where appropriate
  const payload: Record<string, any> = {};
  if (updates.notifications) payload.notifications = updates.notifications;
  if (typeof updates.name !== 'undefined') payload.name = updates.name;
  if (typeof updates.organization !== 'undefined') payload.organization = updates.organization;
  if (typeof updates.location !== 'undefined') payload.location = updates.location;
  if (typeof updates.role !== 'undefined') payload.role = updates.role;
  if (typeof updates.profileImageUrl !== 'undefined') payload.profile_image_url = updates.profileImageUrl;
  if (typeof updates.profileImagePath !== 'undefined') payload.profile_image_path = updates.profileImagePath;
  if (typeof updates.recommendations !== 'undefined') payload.recommendations = updates.recommendations;
  if (typeof updates.reportsSubmitted !== 'undefined') payload.reports_submitted = updates.reportsSubmitted;
  if (typeof updates.passwordHash !== 'undefined') payload.password_hash = updates.passwordHash;
  if (typeof updates.salt !== 'undefined') payload.salt = updates.salt;
  if (typeof updates.verified !== 'undefined') payload.verified = updates.verified;
  if (Object.keys(payload).length === 0) return null;

  const { data, error } = await supabase.from('users').update(payload).eq('id', id).select().single();
  if (error || !data) return null;
  return mapDbToUser(data);
}
