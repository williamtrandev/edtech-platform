-- Add the learning track (programming subject) to Course.
-- Nullable: existing courses stay valid and are backfilled by an author or
-- an admin, not by this migration.
ALTER TABLE "Course" ADD COLUMN "track" TEXT;

-- Track is a list filter and drives the public track catalog counts.
CREATE INDEX "Course_track_idx" ON "Course"("track");
