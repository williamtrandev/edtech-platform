import { useQuery } from "@tanstack/react-query";
import { userService } from "../../../services/user.service";

export function useCurrentUser(enabled: boolean) {
  return useQuery({
    queryKey: ["users", "me"],
    queryFn: userService.getMe,
    enabled
  });
}
