import "express";

declare global {
  namespace Express {
    interface UserClaims {
      id: string;
      email?: string;
      role?: "USER" | "INSTRUCTOR" | "ADMIN";
      signupRole?: "USER" | "INSTRUCTOR";
    }

    interface Request {
      user?: UserClaims;
      /** Set by request-context middleware for log correlation */
      requestId?: string;
      /** Raw request body bytes, captured by the express.json verify hook for webhook signatures. */
      rawBody?: Buffer;
    }
  }
}

export {};
