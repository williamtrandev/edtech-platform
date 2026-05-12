import { User } from "@prisma/client";
import { AppError } from "../../common/errors/app-error";
import { USER_ROLE } from "../../common/constants/business";
import { UserRepository } from "../user/user.repository";

export class AuthRepository {
  constructor(private readonly userRepository: UserRepository) {}

  async upsertAuthUser(payload: { id: string; email?: string; role?: "USER" | "INSTRUCTOR" | "ADMIN" }): Promise<User> {
    const existingUser = await this.userRepository.findById(payload.id);
    if (!existingUser) {
      if (!payload.email) {
        throw new AppError("Email is required to create user", 422, "USER_EMAIL_REQUIRED");
      }

      return this.userRepository.create({
        id: payload.id,
        email: payload.email,
        role: payload.role ?? USER_ROLE.user
      });
    }

    return this.userRepository.update(payload.id, {
      email: payload.email ?? existingUser.email,
      role: payload.role ?? existingUser.role
    });
  }
}
