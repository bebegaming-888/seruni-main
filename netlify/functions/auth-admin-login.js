// Netlify Function: Admin Login
// POST /api/auth/admin-login
// Body: { username, password, remember }
// Returns: { ok: true, session } or { ok: false, error }

import crypto from 'crypto';

const ADMIN_USER = process.env.VITE_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.VITE_ADMIN_PASS || 'admin123';

// PBKDF2 hash untuk password verification
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

export const handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only POST allowed
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),
    };
  }

  try {
    const { username, password, remember } = JSON.parse(event.body || '{}');

    if (!username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Username dan password wajib diisi' }),
      };
    }

    // Verify credentials
    if (username !== ADMIN_USER || password !== ADMIN_PASS) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ ok: false, error: 'Username atau password salah' }),
      };
    }

    // Generate session
    const session = {
      id: crypto.randomUUID(),
      username: ADMIN_USER,
      name: 'Super Admin',
      role: 'Super Admin',
      loginAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (remember ? 7 : 1) * 24 * 60 * 60 * 1000).toISOString(),
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, session }),
    };
  } catch (error) {
    console.error('[admin-login] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: 'Internal server error' }),
    };
  }
};
