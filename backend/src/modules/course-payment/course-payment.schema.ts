import { z } from "zod";
import { PAYMENT_PROVIDER } from "../../common/constants/payment";

const checkoutProviders = [PAYMENT_PROVIDER.stripe, PAYMENT_PROVIDER.vnpay, PAYMENT_PROVIDER.mock] as const;

export const createCoursePaymentSchema = z.object({
  body: z.object({
    courseId: z.string().min(1),
    provider: z.enum(checkoutProviders)
  })
});

export const listCoursePaymentProvidersSchema = z.object({
  query: z.object({
    courseId: z.string().min(1)
  })
});

export const mockReturnSchema = z.object({
  query: z.object({
    paymentId: z.string().min(1)
  })
});

export const coursePaymentStatusSchema = z.object({
  query: z.object({
    courseId: z.string().min(1)
  })
});

export const listMyCoursePaymentsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20)
  })
});
