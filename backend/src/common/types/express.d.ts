import "express";

declare global {
  namespace Express {
    interface UserClaims {
      id: string;
      email?: string;
      role?: "USER" | "ADMIN";
    }

    interface Request {
      user?: UserClaims;
    }
  }
}

export {};
