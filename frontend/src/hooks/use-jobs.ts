import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jobService } from "../services/job.service";

export function useJobQueues(includeSamples: boolean) {
  return useQuery({
    queryKey: ["jobs", "queues", includeSamples],
    queryFn: () => jobService.getQueues(includeSamples),
    refetchInterval: 30_000
  });
}

export function useEmailDelivery() {
  return useQuery({
    queryKey: ["jobs", "email-delivery"],
    queryFn: () => jobService.getEmailDelivery(),
    staleTime: 60_000
  });
}

export function useFailedJobs(queueName: string, page: number, enabled: boolean) {
  return useQuery({
    queryKey: ["jobs", "failed", queueName, page],
    queryFn: () => jobService.listFailedJobs(queueName, page),
    enabled: enabled && Boolean(queueName)
  });
}

function useInvalidateJobs() {
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.invalidateQueries({ queryKey: ["jobs"] });
  };
}

export function useRetryFailedJob() {
  const invalidateJobs = useInvalidateJobs();

  return useMutation({
    mutationFn: ({ queueName, jobId }: { queueName: string; jobId: string }) => jobService.retryFailedJob(queueName, jobId),
    onSuccess: async () => {
      await invalidateJobs();
    }
  });
}

export function useRetryAllFailedJobs() {
  const invalidateJobs = useInvalidateJobs();

  return useMutation({
    mutationFn: ({ queueName, limit }: { queueName: string; limit?: number }) =>
      jobService.retryAllFailedJobs(queueName, limit),
    onSuccess: async () => {
      await invalidateJobs();
    }
  });
}

export function useDiscardFailedJob() {
  const invalidateJobs = useInvalidateJobs();

  return useMutation({
    mutationFn: ({ queueName, jobId }: { queueName: string; jobId: string }) =>
      jobService.discardFailedJob(queueName, jobId),
    onSuccess: async () => {
      await invalidateJobs();
    }
  });
}

export function useMoveFailedJobToDeadLetter() {
  const invalidateJobs = useInvalidateJobs();

  return useMutation({
    mutationFn: ({ queueName, jobId }: { queueName: string; jobId: string }) =>
      jobService.moveFailedJobToDeadLetter(queueName, jobId),
    onSuccess: async () => {
      await invalidateJobs();
    }
  });
}
