import { LIVE_SESSION_STATUS, type LiveSessionStatus } from "../constants/business";

export const DEFAULT_LIVE_SESSION_DURATION_MINUTES = 60;

type ResolveLiveSessionStatusInput = {
  startsAt?: string | null;
  durationMinutes?: number | null;
  now?: Date;
};

export function resolveLiveSessionStatus(input: ResolveLiveSessionStatusInput): LiveSessionStatus {
  const startsAtRaw = input.startsAt?.trim();
  if (!startsAtRaw) {
    return LIVE_SESSION_STATUS.unscheduled;
  }

  const startsAt = new Date(startsAtRaw);
  if (Number.isNaN(startsAt.getTime())) {
    return LIVE_SESSION_STATUS.unscheduled;
  }

  const durationMinutes = input.durationMinutes && input.durationMinutes > 0
    ? input.durationMinutes
    : DEFAULT_LIVE_SESSION_DURATION_MINUTES;
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  const now = input.now ?? new Date();

  if (now < startsAt) {
    return LIVE_SESSION_STATUS.upcoming;
  }

  if (now <= endsAt) {
    return LIVE_SESSION_STATUS.live;
  }

  return LIVE_SESSION_STATUS.ended;
}
