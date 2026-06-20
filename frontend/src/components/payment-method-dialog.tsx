import { useEffect, useMemo, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { CreditCard, Landmark, FlaskConical, Loader2, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCoursePaymentProviders, useCreateCoursePayment } from "../hooks/use-course-payments";
import { useEnrollCourse } from "../hooks/use-enrollments";
import { type I18nKey, useI18n } from "../i18n";
import { formatMoney } from "../lib/course-pricing";
import type { CoursePaymentProvider } from "../services/course-payment.service";

type ProviderMeta = {
  icon: LucideIcon;
  labelKey: I18nKey;
  descKey: I18nKey;
};

const PROVIDER_META: Record<CoursePaymentProvider, ProviderMeta> = {
  STRIPE: { icon: CreditCard, labelKey: "courseDetail.providerStripe", descKey: "courseDetail.providerStripeDesc" },
  VNPAY: { icon: Landmark, labelKey: "courseDetail.providerVnpay", descKey: "courseDetail.providerVnpayDesc" },
  MOCK: { icon: FlaskConical, labelKey: "courseDetail.providerMock", descKey: "courseDetail.providerMockDesc" }
};

type PaymentMethodDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  priceCents: number;
  currency: string;
  /** Called when the course is already paid for and enrollment succeeds without redirect. */
  onEnrolled?: () => void;
};

export function PaymentMethodDialog({
  open,
  onOpenChange,
  courseId,
  priceCents,
  currency,
  onEnrolled
}: PaymentMethodDialogProps) {
  const { t, formatError } = useI18n();
  const providersQuery = useCoursePaymentProviders(courseId, open);
  const createPayment = useCreateCoursePayment();
  const enrollMutation = useEnrollCourse();
  const [selected, setSelected] = useState<CoursePaymentProvider | null>(null);

  const providers = useMemo(() => providersQuery.data?.providers ?? [], [providersQuery.data]);

  // Default selection to the first available provider once loaded.
  useEffect(() => {
    if (open && providers.length > 0 && (!selected || !providers.includes(selected))) {
      setSelected(providers[0]);
    }
  }, [open, providers, selected]);

  const formattedPrice = formatMoney(priceCents, currency);
  const busy = createPayment.isPending || enrollMutation.isPending;

  const handlePay = async () => {
    if (!selected) {
      return;
    }
    try {
      const result = await createPayment.mutateAsync({
        courseId,
        provider: selected,
        idempotencyKey: crypto.randomUUID()
      });

      if (result.redirectUrl) {
        window.location.assign(result.redirectUrl);
        return;
      }

      // Already paid: just enroll and close.
      await enrollMutation.mutateAsync(courseId);
      toast.success(t("courseDetail.paymentSuccess"));
      onOpenChange(false);
      onEnrolled?.();
    } catch (error) {
      toast.error(formatError(error, "courseDetail.purchaseFailed"));
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-5 rounded-lg border border-border bg-popover p-6 text-popover-foreground shadow-lg">
          <div className="grid gap-1.5 text-left">
            <DialogPrimitive.Title className="text-base font-semibold">
              {t("courseDetail.choosePaymentMethod")}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm leading-6 text-muted-foreground">
              {t("courseDetail.paymentMethodDescription")}
            </DialogPrimitive.Description>
          </div>

          <div className="grid gap-2.5">
            {providersQuery.isLoading ? (
              <>
                <div className="h-16 animate-pulse rounded-lg bg-muted" />
                <div className="h-16 animate-pulse rounded-lg bg-muted" />
              </>
            ) : providers.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                {t("courseDetail.noProviders")}
              </p>
            ) : (
              providers.map((provider) => {
                const meta = PROVIDER_META[provider];
                const Icon = meta.icon;
                const isActive = selected === provider;
                return (
                  <button
                    key={provider}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setSelected(provider)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/40 hover:bg-accent"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-md",
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <span className="grid gap-0.5">
                      <span className="text-sm font-medium leading-none">{t(meta.labelKey)}</span>
                      <span className="text-xs leading-snug text-muted-foreground">{t(meta.descKey)}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" disabled={busy || !selected || providers.length === 0} onClick={() => void handlePay()}>
              {busy ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  {t("courseDetail.redirecting")}
                </span>
              ) : (
                t("courseDetail.payNow").replace("{{price}}", formattedPrice)
              )}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
