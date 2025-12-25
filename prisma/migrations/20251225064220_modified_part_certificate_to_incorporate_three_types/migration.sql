-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('PARTICIPATION', 'INTERNSHIP', 'TRAINING');

-- AlterTable
ALTER TABLE "ParticipationCertificate" ADD COLUMN     "eventName" TEXT,
ADD COLUMN     "type" "CertificateType" NOT NULL DEFAULT 'PARTICIPATION',
ALTER COLUMN "classYear" DROP NOT NULL;
