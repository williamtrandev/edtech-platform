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
      /** Set by request-context middleware for log correlation */
      requestId?: string;
    }
  }
}

export {};
