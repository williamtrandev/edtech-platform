import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "../components/auth-shell";
import { FormField } from "../components/form-field";
import { useAuth } from "../features/auth/auth-context";
import { LoginFormValues, loginFormSchema } from "../schemas/auth.schema";

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = async (values: LoginFormValues) => {
    setErrorMessage(null);
    try {
      await signIn(values.email, values.password);
      navigate("/courses", { replace: true });
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to login");
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
