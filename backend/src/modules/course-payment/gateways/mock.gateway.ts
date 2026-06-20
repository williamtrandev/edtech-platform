import { PaymentProvider } from "@prisma/client";
import { PAYMENT_PROVIDER } from "../../../common/constants/payment";
import { env } from "../../../config/env";
import { CheckoutParams, CheckoutResult, PaymentGateway } from "./types";

/**
 * Dev/test gateway. No real charge — redirects to a backend return endpoint that
 * marks the payment completed immediately. Disabled in production. Accepts any currency.
 */
export class MockGateway implements PaymentGateway {
  readonly provider: PaymentProvider = PAYMENT_PROVIDER.mock;

  isEnabled(): boolean {
    return env.NODE_ENV !== "production";
  }

  supportsCurrency(): boolean {
    return true;
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const providerRef = `mock_${params.paymentId}`;
    const redirectUrl = `${params.apiBaseUrl}/course-payments/mock/return?paymentId=${encodeURIComponent(params.paymentId)}`;
    return { redirectUrl, providerRef };
  }
}
