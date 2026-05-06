import { randomUUID } from 'node:crypto';

import { Router } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import jwt from 'jsonwebtoken';

import type { AuthPayload } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const JWT_SECRET =
  process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '8h';
const GUEST_JWT_EXPIRES_IN = '4h';

const OAUTH_TOKEN_URL = process.env.OAUTH_TOKEN_URL ?? '';
const OAUTH_JWKS_URL = process.env.OAUTH_JWKS_URL ?? '';
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID ?? '';
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET ?? '';
const USERINFO_URL =
  process.env.AUTHENTIK_USERINFO_URL ??
  'https://sso.matheo.si/application/o/userinfo/';
const ADMIN_GROUP =
  process.env.AUTHENTIK_ADMIN_GROUP ?? 'parkflow-admins';

// Track users seen since last server start (first-login logging only)
const seenUsers = new Set<string>();

// POST /api/auth/exchange
// Receives: { code, code_verifier, redirect_uri }
// Returns:  { token, id_token }
router.post('/exchange', async (req, res, next) => {
  try {
    const { code, code_verifier, redirect_uri } = req.body as {
      code?: string;
      code_verifier?: string;
      redirect_uri?: string;
    };

    if (!code || !code_verifier || !redirect_uri) {
      res
        .status(400)
        .json({ error: 'code, code_verifier and redirect_uri are required' });
      return;
    }

    // 1. Exchange authorization code for tokens at Authentik
    const tokenRes = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
        client_id: OAUTH_CLIENT_ID,
        client_secret: OAUTH_CLIENT_SECRET,
        code_verifier,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      res.status(401).json({ error: `Token exchange failed: ${err}` });
      return;
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string;
      id_token?: string;
    };

    // 2. Validate id_token signature via JWKS (best-effort, non-fatal)
    if (tokens.id_token && OAUTH_JWKS_URL) {
      try {
        const JWKS = createRemoteJWKSet(new URL(OAUTH_JWKS_URL));
        await jwtVerify(tokens.id_token, JWKS);
      } catch (jwksErr) {
        console.warn('[auth] JWKS verification failed, continuing:', jwksErr instanceof Error ? jwksErr.message : jwksErr);
      }
    }

    // 3. Fetch user info (sub, username, display name, groups)
    const userinfoRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userinfoRes.ok) {
      res.status(401).json({ error: 'Failed to fetch user info' });
      return;
    }

    const userinfo = (await userinfoRes.json()) as {
      sub: string;
      preferred_username?: string;
      name?: string;
      groups?: string[];
    };

    const role = userinfo.groups?.includes(ADMIN_GROUP) ? 'admin' : 'user';

    const payload: AuthPayload = {
      userId: userinfo.sub,
      username: userinfo.preferred_username ?? userinfo.sub,
      displayName:
        userinfo.name ?? userinfo.preferred_username ?? userinfo.sub,
      role,
    };

    if (!seenUsers.has(payload.userId)) {
      seenUsers.add(payload.userId);
      console.log(
        `[login] ${payload.username} (${payload.displayName}) — role: ${role}, groups: ${JSON.stringify(userinfo.groups ?? [])}`,
      );
    }

    // 4. Issue backend JWT
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.json({ token, id_token: tokens.id_token ?? null });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/guest — issues a short-lived JWT for read-only browsing.
// No body required; each call mints a fresh anonymous identity.
router.post('/guest', (_req, res) => {
  const payload: AuthPayload = {
    userId: `guest:${randomUUID()}`,
    username: 'guest',
    displayName: 'Guest',
    role: 'guest',
  };
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: GUEST_JWT_EXPIRES_IN,
  });
  res.json({ token, id_token: null });
});

// GET /api/auth/me — returns current user info from backend JWT
router.get('/me', requireAuth, (req, res) => {
  res.json({
    id: req.user!.userId,
    username: req.user!.username,
    displayName: req.user!.displayName,
    role: req.user!.role,
  });
});

export default router;
