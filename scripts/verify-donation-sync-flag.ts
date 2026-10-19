import assert from 'node:assert/strict';
import { isDonationMemberFeeSyncEnabled } from '../libs/donation-sync-config';

const original = process.env.DONATION_MEMBER_FEE_SYNC_ENABLED;

try {
  delete process.env.DONATION_MEMBER_FEE_SYNC_ENABLED;
  assert.equal(isDonationMemberFeeSyncEnabled(), true);

  for (const value of ['false', 'FALSE', '0', 'off', 'no']) {
    process.env.DONATION_MEMBER_FEE_SYNC_ENABLED = value;
    assert.equal(isDonationMemberFeeSyncEnabled(), false, value);
  }

  for (const value of ['true', '1', 'yes', 'unexpected-value']) {
    process.env.DONATION_MEMBER_FEE_SYNC_ENABLED = value;
    assert.equal(isDonationMemberFeeSyncEnabled(), true, value);
  }

  console.log('Donation member-fee sync flag verification passed.');
} finally {
  if (original === undefined)
    delete process.env.DONATION_MEMBER_FEE_SYNC_ENABLED;
  else process.env.DONATION_MEMBER_FEE_SYNC_ENABLED = original;
}
