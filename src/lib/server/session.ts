import redis from './redis';
import { randomUUID } from 'crypto';

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

export interface SessionData {
  userId?: string;
  city?: string;
  [key: string]: unknown;
}

export async function createSession(data: SessionData): Promise<string> {
  const sessionId = randomUUID();
  await redis.set(
    `session:${sessionId}`,
    JSON.stringify(data),
    'EX',
    SESSION_TTL
  );
  return sessionId;
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const val = await redis.get(`session:${sessionId}`);
  if (!val) return null;
  try {
    return JSON.parse(val) as SessionData;
  } catch {
    return null;
  }
}

export async function updateSession(
  sessionId: string,
  data: Partial<SessionData>
): Promise<void> {
  const existing = await getSession(sessionId);
  if (!existing) return;
  await redis.set(
    `session:${sessionId}`,
    JSON.stringify({ ...existing, ...data }),
    'EX',
    SESSION_TTL // reset TTL on update
  );
}

export async function destroySession(sessionId: string): Promise<void> {
  await redis.del(`session:${sessionId}`);
}