import { useQuery } from "@tanstack/react-query";
import { jobService } from "../services/job.service";

export function useJobQueues() {
  return useQuery({
    queryKey: ["jobs", "queues"],
    queryFn: () => jobService.getQueues(),
    refetchInterval: 30_000
  });
}
