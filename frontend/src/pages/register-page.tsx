import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "../components/auth-shell";
import { FormField } from "../components/form-field";
import { useAuth } from "../features/auth/auth-context";
import { RegisterFormValues, registerFormSchema } from "../schemas/auth.schema";

export function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setErrorMessage(null);
    setMessage(null);
    try {
      await signUp(values.email, values.password);
      setMessage("Check your inbox to confirm your email if required by your project settings.");
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 900);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to register");
    }
  };

  return (
    <AuthShell
      eyebrow="Onboarding"
      title="Create account"
      description="Join your workspace to enroll in courses, complete lessons, and track progress across the platform."
      footer={
        <p>
          Already have an account?{" "}
          <Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      }
    >
      <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FormField id="register-email" label="Work email" error={form.formState.errors.email?.message}>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className="h-11 rounded-xl shadow-sm"
            {...form.register("email")}
          />
        </FormField>

        <FormField id="register-password" label="Password" error={form.formState.errors.password?.message}>
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            className="h-11 rounded-xl shadow-sm"
            {...form.register("password")}
          />
        </FormField>

        <FormField id="register-confirm" label="Confirm password" error={form.formState.errors.confirmPassword?.message}>
          <Input
            id="register-confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat password"
            className="h-11 rounded-xl shadow-sm"
            {...form.register("confirmPassword")}
          />
        </FormField>

        {errorMessage ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{errorMessage}</div>
        ) : null}
        {message ? <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground">{message}</div> : null}

        <Button className="h-11 rounded-xl text-base font-medium shadow-sm" disabled={form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
