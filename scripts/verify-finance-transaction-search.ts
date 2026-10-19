import assert from 'node:assert/strict';
import { matchesFinanceTransactionSearch } from '../libs/finance-transaction-search';

const transaction = {
  amount: '2500.00',
  partyName: 'Relearn Foundation',
  reason: 'General contribution',
  splits: [
    { amount: '1250.50', partyName: 'Annual Member', reason: 'Membership' },
    { amount: '1249.50', partyName: 'Training Centre', reason: 'Materials' },
  ],
};

assert(matchesFinanceTransactionSearch(transaction, 'relearn'));
assert(matchesFinanceTransactionSearch(transaction, 'general contribution'));
assert(matchesFinanceTransactionSearch(transaction, '2,500'));
assert(matchesFinanceTransactionSearch(transaction, 'annual member'));
assert(matchesFinanceTransactionSearch(transaction, 'membership'));
assert(matchesFinanceTransactionSearch(transaction, '1,250.50'));
assert(!matchesFinanceTransactionSearch(transaction, 'unrelated party'));
assert(matchesFinanceTransactionSearch(transaction, ''));

console.log('Finance transaction search verification passed.');
