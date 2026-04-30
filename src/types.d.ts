import type { JwtPayload } from './services/jwt.service.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: JwtPayload;
  }
}
