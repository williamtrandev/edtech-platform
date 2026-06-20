import { PaymentProvider } from "@prisma/client";

export interface CheckoutParams {
  /** Our pending CoursePayment id — round-tripped through the gateway for reconciliation. */
  paymentId: string;
  courseId: string;
  courseTitle: string;
  userId: string;
  userEmail?: string | null;
  amountCents: number;
  currency: string;
  /** Client IP, required by VNPay. */
  clientIp: string;
  /** Public backend base URL for gateway callbacks/returns, e.g. https://api.example.com. */
  apiBaseUrl: string;
  /** Public frontend base URL for post-payment redirects, e.g. https://app.example.com. */
  appUrl: string;
}

export interface CheckoutResult {
  /** URL the client is redirected to in order to pay. */
  redirectUrl: string;
  /** Gateway reference stored on the payment (session id, txnRef, ...). */
  providerRef: string;
  metadata?: Record<string, unknown>;
}

export type GatewayPaymentStatus = "completed" | "failed" | "pending";

export interface VerifyResult {
  providerRef: string;
  /** Our payment id, when the gateway echoed it back. */
  paymentId?: string;
  status: GatewayPaymentStatus;
  raw: Record<string, unknown>;
}

export interface PaymentGateway {
  readonly provider: PaymentProvider;
  /** True when required credentials are configured. */
  isEnabled(): boolean;
  supportsCurrency(currency: string): boolean;
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
}
