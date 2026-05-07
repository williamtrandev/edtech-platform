import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
      role: "USER"
    }
  });

  const onSubmit = async (values: CreateUserFormValues) => {
    await createUserMutation.mutateAsync(values);
    form.reset({ id: "", email: "", role: "USER" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Users</h1>

      <form className="mt-6 grid gap-4 rounded-lg bg-white p-6 shadow" onSubmit={form.handleSubmit(onSubmit)}>
        <input className="rounded border p-2" placeholder="External auth user ID" {...form.register("id")} />
        {form.formState.errors.id && <p className="text-sm text-red-600">{form.formState.errors.id.message}</p>}

        <input className="rounded border p-2" placeholder="Email" type="email" {...form.register("email")} />
        {form.formState.errors.email && <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>}

        <select className="rounded border p-2" {...form.register("role")}>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>

        <button
          type="submit"
          disabled={createUserMutation.isPending}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {createUserMutation.isPending ? "Creating..." : "Create user"}
        </button>
      </form>

      <section className="mt-8 rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-slate-900">User list</h2>
        {isLoading && <p className="mt-4 text-slate-600">Loading users...</p>}
        {isError && <p className="mt-4 text-red-600">Failed to load users: {(error as Error).message}</p>}
        {!isLoading && !isError && (
          <ul className="mt-4 grid gap-3">
            {data?.items.map((user) => (
              <li key={user.id} className="rounded border p-3">
                <p className="font-medium">{user.email}</p>
                <p className="text-sm text-slate-600">
                  {user.id} - {user.role}
                </p>
              </li>
            ))}
          </ul>
        )}
        {!isLoading && !isError && (
          <p className="mt-4 text-xs text-slate-500">
            Page {data?.pagination.page ?? 1} - Limit {data?.pagination.limit ?? 20}
          </p>
        )}
      </section>
    </div>
  );
}
