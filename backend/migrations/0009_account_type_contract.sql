-- Align stored account types with the OpenAPI contract: debit, credit, cash, ewallet.
-- Known legacy aliases are mapped; any other value is left untouched and shown as "other" by clients.
UPDATE accounts
SET type = 'debit'
WHERE lower(trim(type)) IN ('bank', 'savings', 'checking');

UPDATE accounts
SET type = 'ewallet'
WHERE lower(trim(type)) IN ('wallet', 'alipay', 'wechat');
