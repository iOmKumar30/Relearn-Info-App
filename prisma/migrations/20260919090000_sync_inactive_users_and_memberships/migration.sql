-- Repair the existing policy breach without deleting membership or fee data.
-- An inactive user may not retain an active membership.
WITH members_to_deactivate AS (
  SELECT m."id"
  FROM "Member" AS m
  INNER JOIN "User" AS u ON u."id" = m."userId"
  WHERE u."status" = 'INACTIVE'
    AND m."status" = 'ACTIVE'
), updated_members AS (
  UPDATE "Member" AS m
  SET
    "status" = 'INACTIVE',
    "updatedAt" = CURRENT_TIMESTAMP
  FROM members_to_deactivate AS target
  WHERE m."id" = target."id"
  RETURNING m."id"
)
UPDATE "MemberTypeHistory" AS history
SET "endDate" = CURRENT_TIMESTAMP
WHERE history."endDate" IS NULL
  AND history."memberId" IN (SELECT "id" FROM updated_members);
