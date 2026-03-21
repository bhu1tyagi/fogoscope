-- Data migration: Mark false-positive MEV events produced by the broken
-- side-detection logic (comparing token mint addresses against pair symbols).
--
-- Instead of deleting, we mark them as severity='deprecated' so the data
-- is preserved but excluded from active queries.
--
-- Criteria for false positives:
--   1. Zero or null estimated profit (real MEV always extracts value)
--   2. Severity = 'none' (no meaningful impact)
--   3. Estimated profit below $0.50 (noise, not real MEV)

UPDATE "MEVEvent"
SET severity = 'deprecated',
    metadata = COALESCE(metadata, '{}'::jsonb) || '{"legacy": true, "reason": "false_positive_pre_v2_detection"}'::jsonb
WHERE "estimatedProfit" IS NULL
   OR "estimatedProfit" <= 0.5
   OR severity = 'none';
