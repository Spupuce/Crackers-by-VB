// lib/session.js

import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'crackers_session';

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || !secret.trim()) {
    throw new Error('SESSION_SECRET est manquant dans les variables d’environnement.');
  }

  return secret.trim();
}

function toBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function fromBase64Url(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signValue(value) {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(value)
    .digest('base64url');
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${value}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function createSessionValue(sessionPayload) {
  const payload = JSON.stringify(sessionPayload);
  const encodedPayload = toBase64Url(payload);
  const signature = signValue(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifySessionValue(sessionValue) {
  if (!sessionValue || typeof sessionValue !== 'string') {
    return null;
  }

  const [encodedPayload, signature] = sessionValue.split('.');

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signValue(encodedPayload);

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const decodedPayload = fromBase64Url(encodedPayload);
    const parsedPayload = JSON.parse(decodedPayload);

    if (
      !parsedPayload ||
      typeof parsedPayload !== 'object' ||
      typeof parsedPayload.userId !== 'string' ||
      !parsedPayload.userId.trim() ||
      typeof parsedPayload.role !== 'string' ||
      !parsedPayload.role.trim()
    ) {
      return null;
    }

    return {
      userId: parsedPayload.userId.trim(),
      role: parsedPayload.role.trim(),
    };
  } catch {
    return null;
  }
}

export function parseCookies(req) {
  const cookieHeader = req.headers?.cookie;

  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce((accumulator, part) => {
    const [rawName, ...rawValueParts] = part.trim().split('=');

    if (!rawName) {
      return accumulator;
    }

    accumulator[rawName] = rawValueParts.join('=');
    return accumulator;
  }, {});
}

export function getSessionFromRequest(req) {
  const cookies = parseCookies(req);
  const sessionValue = cookies[SESSION_COOKIE_NAME];

  return verifySessionValue(sessionValue);
}

export function setSessionCookie(res, sessionPayload) {
  const sessionValue = createSessionValue(sessionPayload);

  const serializedCookie = serializeCookie(SESSION_COOKIE_NAME, sessionValue, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  res.setHeader('Set-Cookie', serializedCookie);
}

export function clearSessionCookie(res) {
  const serializedCookie = serializeCookie(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  res.setHeader('Set-Cookie', serializedCookie);
}

export function requireAdminSession(req) {
  const session = getSessionFromRequest(req);

  if (!session || session.role !== 'admin') {
    return null;
  }

  return session;
}

export { SESSION_COOKIE_NAME };