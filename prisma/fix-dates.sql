-- Fix ALL dates shifted by IST offset (18:30 or 13:00 UTC)
UPDATE "Member" 
SET "joiningDate" = "joiningDate" + INTERVAL '5 hours 30 minutes'
WHERE EXTRACT(HOUR FROM "joiningDate" AT TIME ZONE 'UTC') IN (18, 13) 
   OR (EXTRACT(HOUR FROM "joiningDate" AT TIME ZONE 'UTC') = 18 AND EXTRACT(MINUTE FROM "joiningDate" AT TIME ZONE 'UTC') = 30);

UPDATE "MemberFee" 
SET "paidOn" = "paidOn" + INTERVAL '5 hours 30 minutes'
WHERE "paidOn" IS NOT NULL 
  AND (EXTRACT(HOUR FROM "paidOn" AT TIME ZONE 'UTC') IN (18, 13) 
   OR (EXTRACT(HOUR FROM "paidOn" AT TIME ZONE 'UTC') = 18 AND EXTRACT(MINUTE FROM "paidOn" AT TIME ZONE 'UTC') = 30));

UPDATE "MemberTypeHistory" 
SET "startDate" = "startDate" + INTERVAL '5 hours 30 minutes'
WHERE "startDate" IS NOT NULL 
  AND (EXTRACT(HOUR FROM "startDate" AT TIME ZONE 'UTC') IN (18, 13) 
   OR (EXTRACT(HOUR FROM "startDate" AT TIME ZONE 'UTC') = 18 AND EXTRACT(MINUTE FROM "startDate" AT TIME ZONE 'UTC') = 30));

UPDATE "MemberTypeHistory" 
SET "endDate" = "endDate" + INTERVAL '5 hours 30 minutes'
WHERE "endDate" IS NOT NULL 
  AND (EXTRACT(HOUR FROM "endDate" AT TIME ZONE 'UTC') IN (18, 13) 
   OR (EXTRACT(HOUR FROM "endDate" AT TIME ZONE 'UTC') = 18 AND EXTRACT(MINUTE FROM "endDate" AT TIME ZONE 'UTC') = 30));
