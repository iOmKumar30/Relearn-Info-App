-- Rename the existing enum value in place: Role IDs and user-role history stay
-- unchanged. This must be deployed with the application that uses MASTER_TUTOR.
ALTER TYPE "RoleName" RENAME VALUE 'TUTOR_OF_TUTOR' TO 'MASTER_TUTOR';

-- A fresh database may not have a Role row for every enum value. Ensure both
-- directory roles can be assigned without modifying any existing role row.
INSERT INTO "Role" ("id", "name", "description")
VALUES
  (gen_random_uuid()::text, 'MASTER_TUTOR', 'Master Tutor role'),
  (gen_random_uuid()::text, 'RELF_EMPLOYEE', 'RELF Employee role')
ON CONFLICT ("name") DO NOTHING;

UPDATE "Role"
SET "description" = 'Master Tutor role'
WHERE "name" = 'MASTER_TUTOR' AND "description" = 'TUTOR_OF_TUTOR role';
