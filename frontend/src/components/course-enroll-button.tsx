import { useState } from "react";
import { toast } from "sonner";
import { type VariantProps } from "class-variance-authority";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCoursePaymentStatus, useCreateCoursePayment } from "../hooks/use-course-payments";
import { useEnrollCourse } from "../hooks/use-enrollments";
import { useI18n } from "../i18n";
import { formatMoney, isPaidCourse } from "../lib/course-pricing";

type CourseEnrollButtonProps = {
  courseId: string;
  priceCents?: number | null;
  currency?: string;
  className?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  onEnrolled?: () => void;
};

export function CourseEnrollButton({
  courseId,
  priceCents,
  currency = "USD",
  className,
  variant = "default",
  onEnrolled
}: CourseEnrollButtonProps) {
  const { t, formatError } = useI18n();
  const enrollMutation = useEnrollCourse();
  const purchaseMutation = useCreateCoursePayment();
  const paymentStatusQuery = useCoursePaymentStatus(courseId, isPaidCourse(priceCents));
  const [isProcessing, setIsProcessing] = useState(false);

  const paid = isPaidCourse(priceCents);
  const hasCompletedPayment = paymentStatusQuery.data?.hasCompletedPayment ?? !paid;
  const formattedPrice = formatMoney(priceCents ?? 0, currency);

  const handleEnroll = async () => {
    setIsProcessing(true);
    try {
      await enrollMutation.mutateAsync(courseId);
      toast.success(t("courseDetail.enrolled"));
      onEnrolled?.();
    } catch (error) {
      toast.error(formatError(error, "courseDetail.enrollFailed"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurchaseAndEnroll = async () => {
    setIsProcessing(true);
    try {
      await purchaseMutation.mutateAsync({
        courseId,
        idempotencyKey: crypto.randomUUID()
      });
      await enrollMutation.mutateAsync(courseId);
      toast.success(t("courseDetail.purchaseAndEnrolled"));
      onEnrolled?.();
    } catch (error) {
      toast.error(formatError(error, "courseDetail.purchaseFailed"));
    } finally {
      setIsProcessing(false);
    }
  };

  const busy = isProcessing || enrollMutation.isPending || purchaseMutation.isPending || paymentStatusQuery.isLoading;

  if (paid && !hasCompletedPayment) {
    return (
      <Button
        size="sm"
        variant={variant}
        className={className}
        disabled={busy}
        type="button"
        onClick={() => {
          void handlePurchaseAndEnroll();
        }}
      >
        {busy ? t("courseDetail.purchasing") : t("courseDetail.purchaseFor").replace("{{price}}", formattedPrice)}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant={variant}
      className={className}
      disabled={busy}
      type="button"
      onClick={() => {
        void handleEnroll();
      }}
    >
      {busy ? t("courseDetail.enrolling") : t("courseDetail.enroll")}
    </Button>
  );
}
