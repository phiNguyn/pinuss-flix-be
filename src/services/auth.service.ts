import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { User, Provider, IUser } from '../models/index.js';
import { loadEnv } from '../config/env.js';

const env = loadEnv();

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

export class AuthService {
  private googleClient: OAuth2Client;

  constructor() {
    this.googleClient = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      'postmessage'
    );
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async verifyGoogleToken(token: string): Promise<GoogleUserInfo> {
    const ticket = await this.googleClient.verifyIdToken({
      idToken: token,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid Google token');
    }

    return {
      id: payload.sub,
      email: payload.email!,
      name: payload.name,
      picture: payload.picture,
    };
  }

  async findOrCreateGoogleUser(googleUser: GoogleUserInfo): Promise<IUser> {
    let user = await User.findOne({ googleId: googleUser.id });

    if (user) {
      if (user.avatar !== googleUser.picture) {
        user.avatar = googleUser.picture;
        await user.save();
      }
      return user;
    }

    const existingUser = await User.findOne({ email: googleUser.email });
    if (existingUser) {
      existingUser.googleId = googleUser.id;
      existingUser.avatar = googleUser.picture;
      existingUser.provider = Provider.GOOGLE;
      await existingUser.save();
      return existingUser;
    }

    user = await User.create({
      email: googleUser.email,
      name: googleUser.name,
      avatar: googleUser.picture,
      provider: Provider.GOOGLE,
      googleId: googleUser.id,
    });

    return user;
  }

  async findUserByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() });
  }

  async findUserById(userId: string): Promise<IUser | null> {
    return User.findById(userId);
  }

  async createLocalUser(email: string, password: string, name?: string): Promise<IUser> {
    const hashedPassword = await this.hashPassword(password);
    return User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      provider: Provider.LOCAL,
    });
  }
}

export const authService = new AuthService();
