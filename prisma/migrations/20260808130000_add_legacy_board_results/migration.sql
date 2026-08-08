CREATE TABLE "legacy_board_results" (
    "id" TEXT NOT NULL,
    "identity_key" TEXT NOT NULL,
    "passing_year" INTEGER NOT NULL,
    "student_name" TEXT NOT NULL,
    "school_name" TEXT NOT NULL,
    "board" TEXT,
    "total_marks" DOUBLE PRECISION,
    "marks_obtained" DOUBLE PRECISION,
    "grade" TEXT,
    "report_card_url" TEXT,
    "student_photo_url" TEXT,
    "parent_contact_number" TEXT,
    "classroom_tutor" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legacy_board_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "legacy_board_results_passing_year_identity_key_key"
  ON "legacy_board_results"("passing_year", "identity_key");
CREATE INDEX "legacy_board_results_passing_year_idx"
  ON "legacy_board_results"("passing_year");
CREATE INDEX "legacy_board_results_student_name_idx"
  ON "legacy_board_results"("student_name");
CREATE INDEX "legacy_board_results_school_name_idx"
  ON "legacy_board_results"("school_name");
