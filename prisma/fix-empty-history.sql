-- 1. Delete rows with literal "Invalid Date" strings
DELETE FROM "MemberTypeHistory" 
WHERE "startDate"::text LIKE '%Invalid Date%' 
   OR "endDate"::text LIKE '%Invalid Date%';

-- 2. Delete rows with NULL/empty dates (cleanup)
DELETE FROM "MemberTypeHistory" 
WHERE "startDate" IS NULL 
   OR "endDate" IS NULL 
   AND ("startDate" IS NOT NULL OR "endDate" IS NOT NULL);

-- 3. Delete orphaned history (no matching member)
DELETE FROM "MemberTypeHistory" mth 
WHERE NOT EXISTS (
  SELECT 1 FROM "Member" m WHERE m.id = mth."memberId"
);

-- 4. Verify (comment out after running)
-- SELECT COUNT(*) FROM "MemberTypeHistory";
