import "express";

declare global {
  namespace Express {
    interface UserClaims {
      id: string;
      email?: string;
      role?: "USER" | "INSTRUCTOR" | "ADMIN";
    }

    interface Request {
      user?: UserClaims;
    }
  }
}

export {};
