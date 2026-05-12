import { AppError } from "../../common/errors/app-error";
import { AuthRepository } from "./auth.repository";

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async getCurrentSession(user: Express.UserClaims | undefined) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return {
      user
    };
  }

  async createSession(user: Express.UserClaims | undefined, payload: { email?: string }) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const authUser = await this.authRepository.upsertAuthUser({
      id: user.id,
      email: payload.email ?? user.email,
      role: user.role
    });

    return {
      user: authUser
    };
  }
}
