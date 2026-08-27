-- Repair balances created by the previous decrement bug.
-- A payment balance cannot be negative; exhausted transactions are zero.
UPDATE payment_transactions
SET remaining_exams = 0
WHERE remaining_exams < 0;
