# Donation receipt → MemberFee automatic-sync runbook

## Scope

This runbook pauses or resumes only the automatic synchronization from a row in `donation` to `MemberFee`. It does not disable donation receipt creation, finance-statement workflows, or the manual **Add donation** action in the finance module.

The application switch is `DONATION_MEMBER_FEE_SYNC_ENABLED`. It is enabled unless its value is one of `false`, `0`, `off`, or `no` (case-insensitive). Set the exact same value in both the Vercel production environment and the Trigger.dev production environment.

When false, the receipt route does not dispatch Trigger.dev and the worker returns before making a Prisma/Neon query. The database trigger is separate from this flag; the safe full-pause procedure disables that trigger too.

## Before pausing

1. Decide the cutover time. Do not manually credit a donation in finance until the pause is complete and reconciliation has been reviewed.
2. In both Vercel and Trigger.dev production environments, set:

   ```env
   DONATION_MEMBER_FEE_SYNC_ENABLED=false
   ```

3. Deploy the app and the Trigger.dev tasks that contain this change. Confirm a Trigger.dev invocation returns `paused: true`; this proves no worker can start a new database update.
4. In the Trigger.dev dashboard, wait for any currently running `sync-donation-outbox` job to finish. Do not change queue rows while a job is still running.
5. In Neon, confirm no row remains in `PROCESSING`:

   ```sql
   SELECT status, COUNT(*) AS rows
   FROM donation_sync_queue
   GROUP BY status
   ORDER BY status;
   ```

   If `PROCESSING` is non-zero, investigate the task first. Do not force it to `PAUSED`, because it may already be completing its atomic MemberFee update.

## Complete reversible pause

Run the following in Neon only after the preceding checks. These statements do **not** modify `donation`, `MemberFee`, or receipt data; they disable future enqueueing and relabel unfinished queue work.

```sql
BEGIN;

ALTER TABLE public.donation
DISABLE TRIGGER donation_enqueue_sync;

UPDATE public.donation_sync_queue
SET status = 'PAUSED',
    updated_at = CURRENT_TIMESTAMP
WHERE status = 'PENDING';

COMMIT;
```

Verify the result:

```sql
SELECT status, COUNT(*) AS rows
FROM donation_sync_queue
GROUP BY status
ORDER BY status;

SELECT q.id AS queue_id,
       q.status,
       q.created_at,
       d.id AS donation_id,
       d.receiptNumber,
       d.date,
       d.name,
       d.email,
       d.amount,
       d.reason
FROM donation_sync_queue q
JOIN donation d ON d.id = q.donation_id
WHERE q.status = 'PAUSED'
ORDER BY q.created_at;
```

Save the second result with the finance reconciliation. It is the definitive list of receipts that were deliberately excluded from automatic MemberFee synchronization. From this point, an administrator may handle eligible payments manually from bank statements using the finance module.

## While paused

- New donation receipts continue to be created normally.
- With the database trigger disabled, they do not create new outbox rows.
- Do not use the automatic membership synchronization for any receipt in the paused period.
- Keep `PAUSED` queue records unchanged. They are evidence of the cutover and must not be bulk-retried after manual finance credits begin.

## Resume safely

1. Reconcile all receipts listed as `PAUSED` against the manual finance credits. Keep them `PAUSED` unless each specific record has been verified not to have been credited manually.
2. Re-enable automatic enqueueing:

   ```sql
   ALTER TABLE public.donation
   ENABLE TRIGGER donation_enqueue_sync;
   ```

3. Set `DONATION_MEMBER_FEE_SYNC_ENABLED=true` in **both** Vercel and Trigger.dev, then deploy both services.
4. Create a non-production test receipt (or use a controlled production test) with a membership reason and a linked member email. Confirm exactly one `PENDING` row becomes `PROCESSED` and the correct `MemberFee` increases once.
5. Never bulk-change all `PAUSED` rows back to `PENDING`. To deliberately replay one record, reconcile it first, then change only that queue ID:

   ```sql
   UPDATE donation_sync_queue
   SET status = 'PENDING',
       updated_at = CURRENT_TIMESTAMP
   WHERE id = '<verified queue UUID>'
     AND status = 'PAUSED';
   ```

   Trigger the worker for the matching donation ID or wait for the scheduled recovery task. Reconfirm the MemberFee total afterwards.

## Operational notes

- `PROCESSED` means the item completed or was intentionally skipped because its reason was not membership-related or its email had no linked member. `FAILED` requires investigation; the daily recovery job only processes `PENDING` rows.
- The daily recovery job runs at 02:15 IST. With the feature flag false, it exits before accessing Neon.
- The database trigger must be disabled/enabled manually because an application environment variable cannot safely control a PostgreSQL trigger.
