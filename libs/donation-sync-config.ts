/**
 * Controls only the automatic donation-receipt -> MemberFee integration.
 *
 * Keep the default enabled for backward compatibility. The value is evaluated
 * at run time so Vercel and Trigger.dev can independently use their own
 * environment configuration without rebuilding shared application state.
 */
export function isDonationMemberFeeSyncEnabled(): boolean {
  const configured =
    process.env.DONATION_MEMBER_FEE_SYNC_ENABLED?.trim().toLowerCase();

  return !['false', '0', 'off', 'no'].includes(configured ?? '');
}
