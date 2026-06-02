import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { AppError } from "../../common/errors/app-error";
import { USER_ROLE } from "../../common/constants/business";
import { AUDIT_ACTION } from "../../common/constants/audit";
import { UserRepository } from "./user.repository";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  private assertAdmin(user: Express.UserClaims | undefined) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    if (user.role !== USER_ROLE.admin) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
  }

  async listUsers(
    user: Express.UserClaims | undefined,
    page: number,
    limit: number,
    search?: string,
    role?: "USER" | "INSTRUCTOR" | "ADMIN",
    status?: "ACTIVE" | "SUSPENDED"
  ) {
    this.assertAdmin(user);
    const { items, total } = await this.userRepository.findMany(page, limit, search, role, status);
    return {
      items,
      pagination: {
        page,
        limit,
        total
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
        role: user.signupRole
      });
    } catch (error: unknown) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("Email already exists", 409, "USER_EMAIL_EXISTS");
      }
      throw error;
    }
  }

  async getUserById(id: string, actor?: Express.UserClaims) {
    if (actor) {
      this.assertAdmin(actor);
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    return user;
  }

  async getUserDetailById(id: string, actor?: Express.UserClaims) {
    this.assertAdmin(actor);

    const user = await this.userRepository.findDetailById(id);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    return user;
  }

  async createUser(payload: { id: string; email: string; role?: "USER" | "INSTRUCTOR" | "ADMIN" }, actor?: Express.UserClaims) {
    if (actor) {
      this.assertAdmin(actor);
    }

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

  async updateUser(id: string, payload: { email?: string; role?: "USER" | "INSTRUCTOR" | "ADMIN"; status?: "ACTIVE" | "SUSPENDED" }, actor?: Express.UserClaims) {
    this.assertAdmin(actor);
    const actorId = actor?.id;
    if (!actorId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    const currentUser = await this.getUserById(id);

    if (payload.role && currentUser.role === USER_ROLE.admin && payload.role !== USER_ROLE.admin) {
      const otherAdminCount = await this.userRepository.countAdmins(id);
      if (otherAdminCount === 0) {
        throw new AppError("Cannot remove the last admin", 409, "LAST_ADMIN_REQUIRED");
      }
    }
    if (payload.status === "SUSPENDED" && currentUser.role === USER_ROLE.admin) {
      const otherAdminCount = await this.userRepository.countAdmins(id);
      if (otherAdminCount === 0) {
        throw new AppError("Cannot suspend the last admin", 409, "LAST_ADMIN_REQUIRED");
      }
    }

    const metadata = {
      before: {
        email: currentUser.email,
        role: currentUser.role,
        status: currentUser.status
      },
      after: {
        email: payload.email ?? currentUser.email,
        role: payload.role ?? currentUser.role,
        status: payload.status ?? currentUser.status
      }
    };

    return this.userRepository.updateWithAudit(id, payload, {
      actorId,
      action: payload.status && payload.status !== currentUser.status ? AUDIT_ACTION.userStatusUpdated : AUDIT_ACTION.userUpdated,
      metadata
    });
  }

  async deleteUser(id: string, actor?: Express.UserClaims) {
    this.assertAdmin(actor);
    const currentUser = await this.getUserById(id);
    if (currentUser.role === USER_ROLE.admin) {
      const otherAdminCount = await this.userRepository.countAdmins(id);
      if (otherAdminCount === 0) {
        throw new AppError("Cannot remove the last admin", 409, "LAST_ADMIN_REQUIRED");
      }
    }
    return this.userRepository.delete(id);
  }
}
