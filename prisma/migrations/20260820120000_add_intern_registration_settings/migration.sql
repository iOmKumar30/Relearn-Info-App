-- A singleton setting for the amount charged to newly registered interns.
-- Existing Intern.feeAmount values remain unchanged.
CREATE TABLE "intern_registration_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "registration_fee" INTEGER NOT NULL DEFAULT 1400,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intern_registration_settings_pkey" PRIMARY KEY ("id")
);
