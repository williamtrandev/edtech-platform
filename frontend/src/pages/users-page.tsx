import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, RotateCcw, Search, Shield, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { USER_ROLE, USER_STATUS, type UserRole, type UserStatus } from "../constants/business";
import { useCreateUser, useUpdateUser, useUsers } from "../hooks/use-users";
import { useI18n } from "../i18n";
import { createUserFormSchema, CreateUserFormValues } from "../schemas/user.schema";

export function UsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | UserStatus>("ALL");
  const { data, isLoading, isError, error } = useUsers({
    search: debouncedSearch,
    role: roleFilter === "ALL" ? undefined : roleFilter,
    status: statusFilter === "ALL" ? undefined : statusFilter
  });
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const { t, formatError } = useI18n();

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      id: "",
      email: "",
      role: USER_ROLE.user
    }
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const onSubmit = async (values: CreateUserFormValues) => {
    try {
      await createUserMutation.mutateAsync(values);
      form.reset({ id: "", email: "", role: USER_ROLE.user });
      toast.success(t("users.created"));
    } catch (e) {
      toast.error(formatError(e, "users.createFailed"));
    }
  };

  const onRoleChange = async (userId: string, role: UserRole) => {
    try {
      await updateUserMutation.mutateAsync({ id: userId, payload: { role } });
      toast.success(t("users.updated"));
    } catch (e) {
      toast.error(formatError(e, "users.updateFailed"));
    }
  };

  const onStatusToggle = async (userId: string, status: UserStatus) => {
    try {
      await updateUserMutation.mutateAsync({ id: userId, payload: { status } });
      toast.success(t(status === USER_STATUS.suspended ? "users.suspended" : "users.reactivated"));
    } catch (e) {
      toast.error(formatError(e, "users.statusUpdateFailed"));
    }
  };

  return (
    <AppShell
      title={t("users.title")}
      subtitle={t("users.subtitle")}
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
              <MetricCard icon={Users} label={t("users.usersOnPage")} value={data?.items.length ?? 0} hint={t("users.currentListWindow")} />
              <MetricCard icon={Shield} label={t("users.roles")} value="RBAC" hint="USER · INSTRUCTOR · ADMIN" />
            </>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <Card className="rounded-2xl border-border/60 bg-card/90 shadow-sm lg:col-span-5">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg font-semibold">{t("users.createUser")}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">{t("users.createDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <FormField id="user-id" label={t("users.userId")} hint={t("users.userIdHint")} error={form.formState.errors.id?.message}>
                  <Input id="user-id" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...form.register("id")} />
                </FormField>

                <FormField id="user-email" label={t("users.email")} error={form.formState.errors.email?.message}>
                  <Input id="user-email" type="email" placeholder="name@company.com" {...form.register("email")} />
                </FormField>

                <FormField id="user-role" label={t("users.role")} error={form.formState.errors.role?.message}>
                  <Controller
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="user-role" className="h-10 w-full rounded-xl border-border/80 shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={USER_ROLE.user}>{t("role.USER")}</SelectItem>
                          <SelectItem value={USER_ROLE.instructor}>{t("role.INSTRUCTOR")}</SelectItem>
                          <SelectItem value={USER_ROLE.admin}>{t("role.ADMIN")}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>

                <Button className="h-10 rounded-xl font-medium shadow-sm" type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? t("users.creating") : t("users.createUser")}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-card/90 shadow-sm lg:col-span-7">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-4">
              <div>
                <CardTitle className="text-lg font-semibold">{t("users.directory")}</CardTitle>
                <CardDescription className="mt-1 text-sm">{t("users.directoryDescription")}</CardDescription>
              </div>
              <div className="grid w-full gap-2 sm:w-auto sm:min-w-[30rem] sm:grid-cols-[minmax(0,1fr)_10rem_10rem]">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("users.searchPlaceholder")}
                    className="h-10 rounded-md border-border/80 pl-9 shadow-none"
                    type="search"
                    aria-label={t("users.searchPlaceholder")}
                  />
                </div>
                <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as typeof roleFilter)}>
                  <SelectTrigger className="h-10 rounded-md border-border/80 shadow-none" aria-label={t("users.role")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("users.roleAll")}</SelectItem>
                    <SelectItem value={USER_ROLE.user}>{t("role.USER")}</SelectItem>
                    <SelectItem value={USER_ROLE.instructor}>{t("role.INSTRUCTOR")}</SelectItem>
                    <SelectItem value={USER_ROLE.admin}>{t("role.ADMIN")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                  <SelectTrigger className="h-10 rounded-md border-border/80 shadow-none" aria-label={t("users.status")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("users.statusAll")}</SelectItem>
                    <SelectItem value={USER_STATUS.active}>{t("users.statusActive")}</SelectItem>
                    <SelectItem value={USER_STATUS.suspended}>{t("users.statusSuspended")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <TableSkeleton cols={5} rows={6} /> : null}
              {isError ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {formatError(error, "errors.unexpected")}
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
                          <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("users.role")}</TableHead>
                          <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("users.status")}</TableHead>
                          <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("users.actions")}</TableHead>
                          <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.items.map((user) => (
                          <TableRow key={user.id} className="border-border/60">
                            <TableCell className="px-4 py-3 font-medium text-foreground">{user.email}</TableCell>
                            <TableCell className="px-4 py-3">
                              <Select value={user.role} onValueChange={(value) => void onRoleChange(user.id, value as typeof user.role)}>
                                <SelectTrigger className="h-9 w-40 rounded-md border-border/80 shadow-none" disabled={updateUserMutation.isPending} aria-label={t("users.role")}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={USER_ROLE.user}>{t("role.USER")}</SelectItem>
                                  <SelectItem value={USER_ROLE.instructor}>{t("role.INSTRUCTOR")}</SelectItem>
                                  <SelectItem value={USER_ROLE.admin}>{t("role.ADMIN")}</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm">
                              <span className={user.status === USER_STATUS.active ? "font-medium text-emerald-700 dark:text-emerald-400" : "font-medium text-destructive"}>
                                {t(user.status === USER_STATUS.active ? "users.statusActive" : "users.statusSuspended")}
                              </span>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <Button
                                type="button"
                                variant={user.status === USER_STATUS.active ? "outline" : "secondary"}
                                size="sm"
                                className="h-9 rounded-md px-3 shadow-none"
                                disabled={updateUserMutation.isPending}
                                onClick={() => void onStatusToggle(user.id, user.status === USER_STATUS.active ? USER_STATUS.suspended : USER_STATUS.active)}
                              >
                                {user.status === USER_STATUS.active ? <Ban className="mr-1.5 size-4" aria-hidden /> : <RotateCcw className="mr-1.5 size-4" aria-hidden />}
                                {t(user.status === USER_STATUS.active ? "users.suspend" : "users.reactivate")}
                              </Button>
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
                    title={t("users.noUsers")}
                    description={t("users.noUsersDescription")}
                  />
                )
              ) : null}
              {!isLoading && !isError ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  Page {data?.pagination.page ?? 1} · {data?.pagination.limit ?? 20} {t("users.pageSize")} · {data?.pagination.total ?? 0} total
                </p>
              ) : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
