# Security Specification - Syria Gaming Hub Wallet

## Data Invariants
1. A User document must have a balance >= 0.
2. A User can only read and write their own profile (except for system-controlled fields).
3. Transactions are immutable once created (for simplicity in this demo, though status might update in real scenarios).
4. Users can only read their own transactions.
5. Users cannot directly update their own balance field; it should ideally be updated via backend functions or strict atomic rules (existsAfter) if supported, but here we will use strict update rules for the demo if necessary, though balance updates are usually triggered by transactions.
   - *Self-correction*: For a purely client-side demo with Firestore, we'll implement strict rules to ensure users can only update balance if they are also creating a transaction record (atomicity).

## The Dirty Dozen Payloads (Rejection Tests)
1. **Balance Spoofing**: Attempting to set balance to a large number on create.
2. **Negative Balance**: Setting balance to -100.
3. **Identity Theft**: Creating a user profile for a different UID.
4. **Illegal Transaction**: Creating a transaction for another user's ID.
5. **Admin Escape**: Adding `isAdmin: true` to a user profile.
6. **Transaction Overwrite**: Updating an existing transaction's amount.
7. **Balance Modification without Transaction**: Updating balance field directly without a batch write including a transaction (though Firestore rules can't strictly enforce a batch write across collections without `getAfter`, we will enforce consistency constraints).
8. **Malicious ID**: Creating a user with a 2KB string as ID.
9. **Status Hijacking**: Setting a transaction status to 'completed' for a fake deposit.
10. **Email Swapping**: Updating email to another user's email.
11. **Shadow Fields**: Adding `isVerified: true` to profile.
12. **Unauthorized Read**: User A trying to read User B's transaction list.

## Test Runner (Logic Verification)
See `firestore.rules.test.ts` for detailed implementation of these checks.
