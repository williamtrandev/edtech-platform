import Stripe from "stripe";
import { PaymentProvider } from "@prisma/client";
import { PAYMENT_PROVIDER, VNPAY_CURRENCY } from "../../../common/constants/payment";
import { env } from "../../../config/env";
import { AppError } from "../../../common/errors/app-error";
import { CheckoutParams, CheckoutResult, PaymentGateway, VerifyResult } from "./types";

/** Stripe Hosted Checkout. Completion is confirmed via webhook (authoritative). */
export class StripeGateway implements PaymentGateway {
  readonly provider: PaymentProvider = PAYMENT_PROVIDER.stripe;
  private readonly client: Stripe | null;

  constructor() {
    this.client = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
  }

  isEnabled(): boolean {
    return Boolean(this.client);
  }

  supportsCurrency(currency: string): boolean {
    // Stripe is multi-currency; we route VND to VNPay instead.
    return currency.toUpperCase() !== VNPAY_CURRENCY;
  }

  private requireClient(): Stripe {
    if (!this.client) {
      throw new AppError("Stripe is not configured", 503, "STRIPE_NOT_CONFIGURED");
    }
    return this.client;
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const client = this.requireClient();

    const session = await client.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: params.currency.toLowerCase(),
            unit_amount: params.amountCents,
            product_data: { name: params.courseTitle }
          }
        }
      ],
      client_reference_id: params.paymentId,
      customer_email: params.userEmail ?? undefined,
      metadata: { paymentId: params.paymentId, courseId: params.courseId, userId: params.userId },
      // Return through the backend so we can verify the session and complete
      // even without a webhook listener (local dev). Webhook stays authoritative.
      success_url: `${params.apiBaseUrl}/course-payments/stripe/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${params.appUrl}/courses/${params.courseId}?payment=cancelled`
    });

    if (!session.url) {
      throw new AppError("Stripe did not return a checkout URL", 502, "STRIPE_NO_CHECKOUT_URL");
    }

    return { redirectUrl: session.url, providerRef: session.id, metadata: { sessionId: session.id } };
  }

  /** Retrieve a Checkout Session by id and map it to a verify result (used by the return URL). */
  async retrieveSession(sessionId: string): Promise<VerifyResult> {
    const client = this.requireClient();
    const session = await client.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
    return {
      providerRef: session.id,
      paymentId: session.metadata?.paymentId ?? session.client_reference_id ?? undefined,
      status: paid ? "completed" : "pending",
      raw: { paymentStatus: session.payment_status, courseId: session.metadata?.courseId }
    };
  }

  /** Verify a webhook payload. Returns null for events we don't act on. */
  verifyWebhook(rawBody: Buffer | string, signature: string): VerifyResult | null {
    const client = this.requireClient();
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new AppError("Stripe webhook secret is not configured", 503, "STRIPE_WEBHOOK_NOT_CONFIGURED");
    }

    let event: Stripe.Event;
    try {
      event = client.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
      throw new AppError(
        `Stripe webhook signature verification failed: ${(error as Error).message}`,
        400,
        "STRIPE_WEBHOOK_INVALID_SIGNATURE"
      );
    }

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      const paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
      return {
        providerRef: session.id,
        paymentId: session.metadata?.paymentId ?? session.client_reference_id ?? undefined,
        status: paid ? "completed" : "pending",
        raw: { eventId: event.id, type: event.type }
      };
    }

    if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        providerRef: session.id,
        paymentId: session.metadata?.paymentId ?? session.client_reference_id ?? undefined,
        status: "failed",
        raw: { eventId: event.id, type: event.type }
      };
    }

    return null;
  }
}
