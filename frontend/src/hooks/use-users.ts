import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userService, type UserListParams } from "../services/user.service";
import { CreateUserFormValues } from "../schemas/user.schema";

export function useUsers(params: UserListParams = {}) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => userService.getUsers(params)
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserFormValues) => userService.createUser(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof userService.updateUser>[1] }) =>
      userService.updateUser(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  });
}
