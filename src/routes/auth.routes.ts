import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  authService,
  generateTokens,
  generateAccessToken,
  verifyRefreshToken,
} from "../services/index.js";
import { User } from "../models/index.js";
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  refreshTokenSchema,
  RegisterInput,
  LoginInput,
  GoogleAuthInput,
  RefreshTokenInput,
} from "./schemas/index.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/register",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = registerSchema.parse(request.body);
        const { email, password, name } = body as RegisterInput;

        const existingUser = await authService.findUserByEmail(email);
        if (existingUser) {
          return reply.status(409).send({
            error: "Conflict",
            message: "Email already registered",
          });
        }

        const user = await authService.createLocalUser(email, password, name);
        const tokens = generateTokens(app, {
          userId: user._id.toString(),
          email: user.email,
        });

        return reply.status(201).send({
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            username: user.username,
            avatar: user.avatar,
            role: user.role,
            provider: user.provider,
          },
          ...tokens,
        });
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        console.error("Register error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to register user",
        });
      }
    },
  );

  app.post("/login", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = loginSchema.parse(request.body);
      const { email, password } = body as LoginInput;

      const user = await authService.findUserByEmail(email);
      if (!user || user.provider !== "local") {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Invalid email or password",
        });
      }

      const isValidPassword = await authService.comparePassword(
        password,
        user.password!,
      );
      if (!isValidPassword) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Invalid email or password",
        });
      }

      const tokens = generateTokens(app, {
        userId: user._id.toString(),
        email: user.email,
      });

      return reply.send({
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          role: user.role,
          provider: user.provider,
        },
        ...tokens,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({
          error: "Validation Error",
          details: error.errors,
        });
      }
      console.error("Login error:", error);
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Failed to login",
      });
    }
  });

  app.post("/google", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = googleAuthSchema.parse(request.body);
      const { token } = body as GoogleAuthInput;

      const googleUser = await authService.verifyGoogleToken(token);
      const user = await authService.findOrCreateGoogleUser(googleUser);

      const tokens = generateTokens(app, {
        userId: user._id.toString(),
        email: user.email,
      });

      return reply.send({
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          role: user.role,
          provider: user.provider,
        },
        ...tokens,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({
          error: "Validation Error",
          details: error.errors,
        });
      }
      console.error("Google auth error:", error);
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid Google token",
      });
    }
  });

  app.post("/refresh", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = refreshTokenSchema.parse(request.body);
      const { refreshToken } = body as RefreshTokenInput;

      const payload = verifyRefreshToken(app, refreshToken);
      const newAccessToken = generateAccessToken(app, payload);

      return reply.send({
        accessToken: newAccessToken,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({
          error: "Validation Error",
          details: error.errors,
        });
      }
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid or expired refresh token",
      });
    }
  });

  app.post(
    "/logout",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ message: "Logged out successfully" });
    },
  );

  /**
   * POST /api/v1/auth/me/activity - Update user's last activity (lastLogin)
   * Called when user opens the app to track recent access
   */
  app.post(
    "/me/activity",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;

        await User.findByIdAndUpdate(userId, { lastLogin: new Date() });

        return reply.send({
          success: true,
          message: "Activity recorded",
        });
      } catch (error) {
        console.error("Update activity error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update activity",
        });
      }
    },
  );
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}
