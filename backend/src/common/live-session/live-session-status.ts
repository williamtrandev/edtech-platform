import { DEFAULT_LIVE_SESSION_DURATION_MINUTES, LIVE_SESSION_STATUS, type LiveSessionStatus } from "../constants/live-session";

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

export function resolveLiveSessionEndsAt(startsAt: string, durationMinutes?: number | null) {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const duration = durationMinutes && durationMinutes > 0 ? durationMinutes : DEFAULT_LIVE_SESSION_DURATION_MINUTES;
  return new Date(start.getTime() + duration * 60_000);
}
