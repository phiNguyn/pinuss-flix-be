import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { loadEnv } from '../config/env.js';

const env = loadEnv();

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export async function registerJwt(app: FastifyInstance): Promise<void> {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  });
}

export function generateTokens(app: FastifyInstance, payload: JwtPayload): TokenPair {
  const accessToken = app.jwt.sign(payload);
const refreshToken = app.jwt.sign(payload, {
      key: env.JWT_REFRESH_SECRET,
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    });

  return { accessToken, refreshToken };
}

export function generateAccessToken(app: FastifyInstance, payload: JwtPayload): string {
  return app.jwt.sign(payload);
}

export function verifyRefreshToken(app: FastifyInstance, token: string): JwtPayload {
  return app.jwt.verify(token, { key: env.JWT_REFRESH_SECRET });
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}
