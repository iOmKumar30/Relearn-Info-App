-- This changes the default for future inserts only. Existing attendance rows
-- and their recorded statuses remain unchanged.
ALTER TABLE "TutorTrainingAttendance"
  ALTER COLUMN "status" SET DEFAULT 'ABSENT';
