import { zodResolver } from "@hookform/resolvers/zod";
import { Shield, Users } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppShell } from "../components/app-shell";
import { EmptyState } from "../components/empty-state";
import { FormField } from "../components/form-field";
import { MetricCard } from "../components/metric-card";
import { MetricCardSkeleton, TableSkeleton } from "../components/skeleton";
import { USER_ROLE } from "../constants/business";
import { useCreateUser, useUsers } from "../features/user/hooks/use-users";
import { createUserFormSchema, CreateUserFormValues } from "../schemas/user.schema";

export function UsersPage() {
  const { data, isLoading, isError, error } = useUsers();
  const createUserMutation = useCreateUser();

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      id: "",
      email: "",
      role: USER_ROLE.user
    }
  });

  const onSubmit = async (values: CreateUserFormValues) => {
    await createUserMutation.mutateAsync(values);
    form.reset({ id: "", email: "", role: USER_ROLE.user });
  };

  return (
    <AppShell
      title="Users"
      subtitle="Provision accounts and review identities synced with your auth provider."
    >
      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-2">
          {isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <MetricCard icon={Users} label="Users on page" value={data?.items.length ?? 0} hint="Current list window" />
              <MetricCard icon={Shield} label="Roles" value="RBAC" hint="USER · INSTRUCTOR · ADMIN" />
            </>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <Card className="rounded-2xl border-border/60 bg-card/90 shadow-sm lg:col-span-5">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg font-semibold">Create user</CardTitle>
              <CardDescription className="text-sm leading-relaxed">Manual onboarding for external auth user IDs.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <FormField id="user-id" label="User ID" hint="Supabase UUID" error={form.formState.errors.id?.message}>
                  <Input id="user-id" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...form.register("id")} />
                </FormField>

                <FormField id="user-email" label="Email" error={form.formState.errors.email?.message}>
                  <Input id="user-email" type="email" placeholder="name@company.com" {...form.register("email")} />
                </FormField>

                <FormField id="user-role" label="Role" error={form.formState.errors.role?.message}>
                  <Controller
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="user-role" className="h-10 w-full rounded-xl border-border/80 shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={USER_ROLE.user}>User</SelectItem>
                          <SelectItem value={USER_ROLE.instructor}>Instructor</SelectItem>
                          <SelectItem value={USER_ROLE.admin}>Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>

                <Button className="h-10 rounded-xl font-medium shadow-sm" type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "Creating…" : "Create user"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-card/90 shadow-sm lg:col-span-7">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-4">
              <div>
                <CardTitle className="text-lg font-semibold">Directory</CardTitle>
                <CardDescription className="mt-1 text-sm">Workspace members visible to your session.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <TableSkeleton cols={3} rows={6} /> : null}
              {isError ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {(error as Error).message}
                </div>
              ) : null}
              {!isLoading && !isError ? (
                data?.items.length ? (
                  <div className="overflow-hidden rounded-2xl border border-border/60 shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/60 hover:bg-transparent">
                          <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Email
                          </TableHead>
                          <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</TableHead>
                          <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.items.map((user) => (
                          <TableRow key={user.id} className="border-border/60">
                            <TableCell className="px-4 py-3 font-medium text-foreground">{user.email}</TableCell>
                            <TableCell className="px-4 py-3">
                              <Badge variant="outline" className="rounded-md font-medium">
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate px-4 py-3 font-mono text-xs text-muted-foreground">{user.id}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <EmptyState
                    icon={Users}
                    title="No users found"
                    description="Create a user using the form to populate this directory."
                  />
                )
              ) : null}
              {!isLoading && !isError ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  Page {data?.pagination.page ?? 1} · {data?.pagination.limit ?? 20} per page
                </p>
              ) : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
