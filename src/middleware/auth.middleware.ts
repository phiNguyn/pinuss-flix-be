import { FastifyRequest, FastifyReply } from "fastify";
import { adminService } from "../services/index.js";
import { UserRole } from "../models/user.model.js";

/**
 * Middleware to verify JWT token
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Token không hợp lệ",
      });
    }

    const decoded = await (request.server as any).jwt.verify(
      authHeader.replace("Bearer ", ""),
    );

    if (!decoded?.userId) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Token không hợp lệ",
      });
    }

    (request as any).userId = decoded.userId;
  } catch (error) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Token không hợp lệ hoặc đã hết hạn",
    });
  }
}

/**
 * Middleware to verify user has required role
 */
export async function requireRole(role: UserRole) {
  return async function (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const authHeader = request.headers.authorization;

      if (!authHeader?.startsWith("Bearer ")) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Token không hợp lệ",
        });
      }

      const decoded = await (request.server as any).jwt.verify(
        authHeader.replace("Bearer ", ""),
      );

      if (!decoded?.userId) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Token không hợp lệ",
        });
      }

      const { isAdmin } = await adminService.verifyAdmin(decoded.userId);

      if (role === UserRole.ADMIN && !isAdmin) {
        return reply.status(403).send({
          error: "Forbidden",
          message: "Bạn không có quyền truy cập trang này",
        });
      }

      (request as any).userId = decoded.userId;
    } catch (error) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Token không hợp lệ hoặc đã hết hạn",
      });
    }
  };
}
