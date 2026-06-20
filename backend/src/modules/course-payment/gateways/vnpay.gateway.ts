import crypto from "crypto";
import querystring from "querystring";
import { PaymentProvider } from "@prisma/client";
import { PAYMENT_PROVIDER, VNPAY_CURRENCY } from "../../../common/constants/payment";
import { env } from "../../../config/env";
import { AppError } from "../../../common/errors/app-error";
import { CheckoutParams, CheckoutResult, PaymentGateway, VerifyResult } from "./types";

/**
 * VNPay redirect gateway (VND only). Builds an HMAC-SHA512-signed payment URL and
 * verifies the signed return/IPN callbacks. Follows the official VNPay 2.1.0 spec.
 */
export class VnpayGateway implements PaymentGateway {
  readonly provider: PaymentProvider = PAYMENT_PROVIDER.vnpay;

  isEnabled(): boolean {
    return Boolean(env.VNPAY_TMN_CODE && env.VNPAY_HASH_SECRET);
  }

  supportsCurrency(currency: string): boolean {
    return currency.toUpperCase() === VNPAY_CURRENCY;
  }

  private requireConfig() {
    if (!env.VNPAY_TMN_CODE || !env.VNPAY_HASH_SECRET) {
      throw new AppError("VNPay is not configured", 503, "VNPAY_NOT_CONFIGURED");
    }
    return { tmnCode: env.VNPAY_TMN_CODE, hashSecret: env.VNPAY_HASH_SECRET };
  }

  /** Sort keys and URL-encode values the way VNPay expects (spaces as "+"). */
  private sortAndEncode(params: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {};
    for (const key of Object.keys(params).sort()) {
      sorted[key] = encodeURIComponent(params[key]).replace(/%20/g, "+");
    }
    return sorted;
  }

  private sign(encodedParams: Record<string, string>, hashSecret: string): string {
    const signData = querystring.stringify(encodedParams, undefined, undefined, {
      encodeURIComponent: (v) => v
    });
    return crypto.createHmac("sha512", hashSecret).update(Buffer.from(signData, "utf-8")).digest("hex");
  }

  /** yyyyMMddHHmmss in GMT+7. */
  private formatVnpDate(date: Date): string {
    const gmt7 = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const p = (n: number) => String(n).padStart(2, "0");
    return (
      `${gmt7.getUTCFullYear()}${p(gmt7.getUTCMonth() + 1)}${p(gmt7.getUTCDate())}` +
      `${p(gmt7.getUTCHours())}${p(gmt7.getUTCMinutes())}${p(gmt7.getUTCSeconds())}`
    );
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const { tmnCode, hashSecret } = this.requireConfig();

    const ipAddr = params.clientIp || "127.0.0.1";
    const txnRef = params.paymentId;
    const now = new Date();
    const expire = new Date(now.getTime() + 15 * 60 * 1000);

    const vnpParams: Record<string, string> = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: VNPAY_CURRENCY,
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan khoa hoc ${params.courseId}`,
      vnp_OrderType: "other",
      // VND has no minor unit: amountCents holds the whole VND amount; VNPay wants amount * 100.
      vnp_Amount: String(params.amountCents * 100),
      vnp_ReturnUrl: `${params.apiBaseUrl}/course-payments/vnpay/return`,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: this.formatVnpDate(now),
      vnp_ExpireDate: this.formatVnpDate(expire)
    };

    const encoded = this.sortAndEncode(vnpParams);
    encoded.vnp_SecureHash = this.sign(encoded, hashSecret);

    const query = querystring.stringify(encoded, undefined, undefined, { encodeURIComponent: (v) => v });
    const redirectUrl = `${env.VNPAY_PAY_URL}?${query}`;

    return { redirectUrl, providerRef: txnRef, metadata: { txnRef } };
  }

  /** Verify a signed return/IPN callback. Throws on bad signature. */
  verifyCallback(query: Record<string, unknown>): VerifyResult {
    const { hashSecret } = this.requireConfig();

    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        params[key] = String(value);
      }
    }

    const receivedHash = params.vnp_SecureHash ?? "";
    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    const encoded = this.sortAndEncode(params);
    const expectedHash = this.sign(encoded, hashSecret);

    const valid =
      receivedHash.length === expectedHash.length &&
      crypto.timingSafeEqual(Buffer.from(receivedHash, "hex"), Buffer.from(expectedHash, "hex"));

    if (!valid) {
      throw new AppError("VNPay signature verification failed", 400, "VNPAY_INVALID_SIGNATURE");
    }

    const success = params.vnp_ResponseCode === "00" && params.vnp_TransactionStatus === "00";

    return {
      providerRef: params.vnp_TxnRef,
      paymentId: params.vnp_TxnRef,
      status: success ? "completed" : "failed",
      raw: {
        responseCode: params.vnp_ResponseCode,
        transactionStatus: params.vnp_TransactionStatus,
        amount: params.vnp_Amount,
        bankCode: params.vnp_BankCode,
        transactionNo: params.vnp_TransactionNo
      }
    };
  }
}
