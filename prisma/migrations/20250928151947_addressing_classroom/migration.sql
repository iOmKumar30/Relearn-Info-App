-- AlterTable
ALTER TABLE "public"."Centre" ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "street_address" DROP NOT NULL,
ALTER COLUMN "state" DROP NOT NULL,
ALTER COLUMN "pincode" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Classroom" ADD COLUMN     "city" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "pincode" VARCHAR(10),
ADD COLUMN     "state" TEXT,
ADD COLUMN     "street_address" TEXT,
ALTER COLUMN "section_code" DROP NOT NULL,
ALTER COLUMN "timing" DROP NOT NULL,
ALTER COLUMN "monthly_allowance" DROP NOT NULL,
ALTER COLUMN "date_created" DROP NOT NULL;
