-- DropIndex
DROP INDEX "public"."Classroom_centre_id_section_code_idx";

-- CreateIndex
CREATE INDEX "Classroom_centre_id_idx" ON "Classroom"("centre_id");
