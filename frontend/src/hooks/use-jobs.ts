import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jobService } from "../services/job.service";

export function useJobQueues() {
  return useQuery({
    queryKey: ["jobs", "queues"],
    queryFn: () => jobService.getQueues(),
    refetchInterval: 30_000
  });
}

export function useRetryFailedJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ queueName, jobId }: { queueName: string; jobId: string }) => jobService.retryFailedJob(queueName, jobId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["jobs", "queues"] });
    }
  });
}
