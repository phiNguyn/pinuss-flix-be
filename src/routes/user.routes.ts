import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authService } from "../services/index.js";
import { authenticate } from "../services/jwt.service.js";
import {
  updateProfileSchema,
  paginationSchema,
  UpdateProfileInput,
  PaginationInput,
} from "./schemas/index.js";

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", authenticate);

  app.get("/me", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await authService.findUserById(request.user.userId);

      if (!user) {
        return reply.status(404).send({
          error: "Not Found",
          message: "User not found",
        });
      }

      return reply.send({
        id: user._id,
        email: user.email,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        provider: user.provider,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error) {
      console.error("Get profile error:", error);
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Failed to get user profile",
      });
    }
  });

  app.patch("/me", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = updateProfileSchema.parse(request.body);
      const { name, username, avatar, bio } = body as UpdateProfileInput;

      const user = await authService.findUserById(request.user.userId);

      if (!user) {
        return reply.status(404).send({
          error: "Not Found",
          message: "User not found",
        });
      }

      if (name !== undefined) user.name = name;
      if (username !== undefined) user.username = username;
      if (avatar !== undefined) user.avatar = avatar ?? undefined;
      if (bio !== undefined) user.bio = bio ?? undefined;

      await user.save();

      return reply.send({
        id: user._id,
        email: user.email,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        provider: user.provider,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({
          error: "Validation Error",
          details: error.errors,
        });
      }
      console.error("Update profile error:", error);
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Failed to update user profile",
      });
    }
  });

  app.get("/settings", async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      userId: request.user.userId,
      email: request.user.email,
    });
  });
}
