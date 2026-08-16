-- Additive change: existing intern rows retain their data and receive an empty value.
ALTER TABLE "Intern"
ADD COLUMN "previousInstitute" TEXT DEFAULT '';
