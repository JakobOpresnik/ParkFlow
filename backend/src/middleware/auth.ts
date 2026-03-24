import type { NextFunction, Request, Response } from 'express';

export interface AuthPayload {
  userId: string;
  username: string;
  displayName: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const USERINFO_URL =
  process.env.AUTHENTIK_USERINFO_URL ??
  'https://sso.matheo.si/application/o/userinfo/';
const ADMIN_GROUP = process.env.AUTHENTIK_ADMIN_GROUP ?? 'parkflow-admins';

// Track users seen since last server start to log only on first request
const seenUsers = new Set<string>();

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const userinfoRes = await fetch(USERINFO_URL, {
      headers: { Authorization: header },
    });

    if (!userinfoRes.ok) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const userinfo = (await userinfoRes.json()) as {
      sub: string;
      preferred_username?: string;
      name?: string;
      groups?: string[];
    };

    const role = userinfo.groups?.includes(ADMIN_GROUP) ? 'admin' : 'user';
    req.user = {
      userId: userinfo.sub,
      username: userinfo.preferred_username ?? userinfo.sub,
      displayName: userinfo.name ?? userinfo.preferred_username ?? userinfo.sub,
      role,
    };

    if (!seenUsers.has(req.user.userId)) {
      seenUsers.add(req.user.userId);
      console.log(
        `[login] ${req.user.username} (${req.user.displayName}) — role: ${role}, groups: ${JSON.stringify(userinfo.groups ?? [])}`,
      );
    }

    next();
  } catch {
    res.status(401).json({ error: 'Token validation failed' });
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
