import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "../components/auth-shell";
import { FormField } from "../components/form-field";
import { useAuth } from "../features/auth/auth-context";
import { LoginFormValues, loginFormSchema } from "../schemas/auth.schema";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { signIn } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ title: string; body: string } | null>(null);
  const consumedRegisterQuery = useRef(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  useEffect(() => {
    if (consumedRegisterQuery.current) {
      return;
    }

    if (searchParams.get("registered") !== "1") {
      return;
    }

    consumedRegisterQuery.current = true;
    const needsVerify = searchParams.get("verify") === "1";

    if (needsVerify) {
      const title = "Confirm your email";
      const body = "We sent a confirmation link. Open it on this device, then return here to sign in.";
      setBanner({ title, body });
      toast.success(title, { description: body, duration: 8000 });
    } else {
      const title = "Account ready";
      const body = "You can sign in with the email and password you just created.";
      setBanner({ title, body });
      toast.success(title, { description: body, duration: 6000 });
    }

    const next = new URLSearchParams(searchParams);
    next.delete("registered");
    next.delete("verify");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const onSubmit = async (values: LoginFormValues) => {
    setErrorMessage(null);
    try {
      await signIn(values.email, values.password);
      toast.success("Signed in successfully");
      navigate("/", { replace: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to login";
      setErrorMessage(message);
      toast.error(message, { duration: 6000 });
    }
  };

  return (
    <AuthShell
      eyebrow="Authentication"
      title="Sign in"
      description="A focused workspace for courses, lessons, and progress. Sign in to continue where you left off."
      footer={
        <p>
          New here?{" "}
          <Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/register">
            Create an account
          </Link>
        </p>
      }
    >
      {banner ? (
        <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-foreground">
          <p className="font-semibold">{banner.title}</p>
          <p className="mt-1 text-muted-foreground">{banner.body}</p>
        </div>
      ) : null}

      <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FormField id="login-email" label="Work email" error={form.formState.errors.email?.message}>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className="h-11 rounded-xl shadow-sm"
            {...form.register("email")}
          />
        </FormField>

        <FormField id="login-password" label="Password" error={form.formState.errors.password?.message}>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-11 rounded-xl shadow-sm"
            {...form.register("password")}
          />
        </FormField>

        {errorMessage ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{errorMessage}</div>
        ) : null}

        <Button className="h-11 rounded-xl text-base font-medium shadow-sm" disabled={form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting ? "Signing in…" : "Continue"}
        </Button>
      </form>
    </AuthShell>
  );
}
