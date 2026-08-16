-- Database-owned transactional outbox for donations created by either app.
-- The trigger executes in the same transaction as the donation INSERT.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "donation_sync_queue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "donation_id" TEXT NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donation_sync_queue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "donation_sync_queue_donation_id_key"
  ON "donation_sync_queue"("donation_id");
CREATE INDEX "donation_sync_queue_status_created_at_idx"
  ON "donation_sync_queue"("status", "created_at");

CREATE OR REPLACE FUNCTION public.enqueue_donation_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.donation_sync_queue (
    id,
    donation_id,
    status,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    NEW.id,
    'PENDING',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (donation_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS donation_enqueue_sync ON public.donation;

CREATE TRIGGER donation_enqueue_sync
AFTER INSERT ON public.donation
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_donation_sync();
