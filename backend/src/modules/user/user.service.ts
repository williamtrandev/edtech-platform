import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { AppError } from "../../common/errors/app-error";
import { USER_ROLE } from "../../common/constants/business";
import { UserRepository } from "./user.repository";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async listUsers(page: number, limit: number) {
    const users = await this.userRepository.findMany(page, limit);
    return {
      items: users,
      pagination: {
        page,
        limit
      }
    };
  }

  async getMe(user: Express.UserClaims | undefined) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const existingUser = await this.userRepository.findById(user.id);
    if (existingUser) {
      return existingUser;
    }

    if (!user.email) {
      throw new AppError("Email is required to create user", 422, "USER_EMAIL_REQUIRED");
    }

    try {
      return await this.userRepository.upsertAuthUser({
        id: user.id,
        email: user.email,
        role: user.role
      });
    } catch (error: unknown) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("Email already exists", 409, "USER_EMAIL_EXISTS");
      }
      throw error;
    }
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    return user;
  }

  async createUser(payload: { id: string; email: string; role?: "USER" | "INSTRUCTOR" | "ADMIN" }) {
    try {
      return await this.userRepository.create({
        id: payload.id,
        email: payload.email,
        role: payload.role ?? USER_ROLE.user
      });
    } catch (error: unknown) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("Email already exists", 409, "USER_EMAIL_EXISTS");
      }
      throw error;
    }
  }

  async updateUser(id: string, payload: { email?: string; role?: "USER" | "INSTRUCTOR" | "ADMIN" }) {
    await this.getUserById(id);
    return this.userRepository.update(id, payload);
  }

  async deleteUser(id: string) {
    await this.getUserById(id);
    return this.userRepository.delete(id);
  }
}
