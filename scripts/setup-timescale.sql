-- ============================================================
-- FogoScope: TimescaleDB hypertable setup
--
-- Prerequisites:
--   - PostgreSQL with TimescaleDB extension installed
--   - Prisma migrations already applied (tables exist)
--
-- Usage:
--   psql $DATABASE_URL -f scripts/setup-timescale.sql
-- ============================================================

-- Enable the TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert time-series tables to hypertables.
-- chunk_time_interval controls how wide each chunk is in time.

SELECT create_hypertable('"Trade"', 'timestamp', chunk_time_interval => INTERVAL '1 hour', if_not_exists => TRUE);
SELECT create_hypertable('"BlockMetric"', 'timestamp', chunk_time_interval => INTERVAL '1 hour', if_not_exists => TRUE);
SELECT create_hypertable('"MEVEvent"', 'timestamp', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);
SELECT create_hypertable('"TokenPrice"', 'timestamp', chunk_time_interval => INTERVAL '1 hour', if_not_exists => TRUE);
SELECT create_hypertable('"NetworkSnapshot"', 'timestamp', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- Retention policies: automatically drop chunks older than the specified interval.

SELECT add_retention_policy('"Trade"', INTERVAL '30 days', if_not_exists => TRUE);
SELECT add_retention_policy('"BlockMetric"', INTERVAL '7 days', if_not_exists => TRUE);
SELECT add_retention_policy('"TokenPrice"', INTERVAL '14 days', if_not_exists => TRUE);
