import { User } from "@prisma/client";
import { AppError } from "../../common/errors/app-error";
import { UserRepository } from "../user/user.repository";

export class AuthRepository {
  constructor(private readonly userRepository: UserRepository) {}

  async upsertAuthUser(payload: { id: string; email?: string; role?: "USER" | "INSTRUCTOR" | "ADMIN" }): Promise<User> {
    if (!payload.email) {
      throw new AppError("Email is required to create user", 422, "USER_EMAIL_REQUIRED");
    }

    return this.userRepository.upsertAuthUser({
      id: payload.id,
      email: payload.email,
      role: payload.role
    });
  }
}
