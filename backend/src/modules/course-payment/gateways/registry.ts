import { PaymentProvider } from "@prisma/client";
import { AppError } from "../../../common/errors/app-error";
import { MockGateway } from "./mock.gateway";
import { StripeGateway } from "./stripe.gateway";
import { VnpayGateway } from "./vnpay.gateway";
import { PaymentGateway } from "./types";

export const mockGateway = new MockGateway();
export const stripeGateway = new StripeGateway();
export const vnpayGateway = new VnpayGateway();

const gateways: PaymentGateway[] = [stripeGateway, vnpayGateway, mockGateway];

export function getGateway(provider: PaymentProvider): PaymentGateway {
  const gateway = gateways.find((g) => g.provider === provider);
  if (!gateway) {
    throw new AppError(`Unknown payment provider: ${provider}`, 400, "UNKNOWN_PAYMENT_PROVIDER");
  }
  return gateway;
}

/** Enabled gateways that can settle the given currency. */
export function getAvailableGateways(currency: string): PaymentGateway[] {
  return gateways.filter((g) => g.isEnabled() && g.supportsCurrency(currency));
}
