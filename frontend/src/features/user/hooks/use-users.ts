import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "../../../services/user.service";
import { CreateUserFormValues } from "../../../schemas/user.schema";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: userService.getUsers
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
