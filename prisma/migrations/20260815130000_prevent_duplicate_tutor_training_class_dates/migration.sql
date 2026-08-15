-- Do not discard historical class or attendance data. Stop safely if legacy
-- data already contains two training classes on the same calendar date.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "TutorTrainingClass"
    GROUP BY "year_id", ("date"::date)
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce one tutor training class per date: duplicate legacy class dates must be resolved first.';
  END IF;
END $$;

ALTER TABLE "TutorTrainingClass"
  ADD CONSTRAINT "TutorTrainingClass_year_id_date_key" UNIQUE ("year_id", "date");
