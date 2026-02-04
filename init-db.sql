-- ATLAS-GATE-MCP PostgreSQL Initialization Schema

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  session_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  role VARCHAR(50) NOT NULL,
  tool VARCHAR(255) NOT NULL,
  workspace_root VARCHAR(1024),
  plan_hash VARCHAR(64),
  phase_id VARCHAR(64),
  result VARCHAR(20) NOT NULL, -- 'ok' or 'error'
  error_code VARCHAR(50),
  args JSONB,
  notes TEXT,
  hash_chain VARCHAR(64) NOT NULL,
  seq BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT audit_log_hash_unique UNIQUE (hash_chain)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_session_id ON audit_log(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_tool ON audit_log(tool);
CREATE INDEX IF NOT EXISTS idx_audit_result ON audit_log(result);
CREATE INDEX IF NOT EXISTS idx_audit_workspace ON audit_log(workspace_root);
CREATE INDEX IF NOT EXISTS idx_audit_plan_hash ON audit_log(plan_hash) WHERE plan_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_error_code ON audit_log(error_code) WHERE error_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_seq ON audit_log(seq DESC);

-- Session tracking table
CREATE TABLE IF NOT EXISTS sessions (
  session_id UUID PRIMARY KEY,
  workspace_root VARCHAR(1024) NOT NULL,
  role VARCHAR(50),
  active_plan_id VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
  
  CONSTRAINT sessions_workspace_unique UNIQUE (workspace_root, session_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at) WHERE expires_at > NOW();

-- Plan storage table
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  plan_hash VARCHAR(64) UNIQUE NOT NULL,
  workspace_root VARCHAR(1024) NOT NULL,
  plan_content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  
  CONSTRAINT plans_hash_format CHECK (plan_hash ~ '^[a-f0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_plans_workspace ON plans(workspace_root);
CREATE INDEX IF NOT EXISTS idx_plans_hash ON plans(plan_hash);
CREATE INDEX IF NOT EXISTS idx_plans_created ON plans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status);

-- Archive table for old audit logs (for retention policy)
CREATE TABLE IF NOT EXISTS audit_log_archive (LIKE audit_log);
CREATE INDEX IF NOT EXISTS idx_archive_timestamp ON audit_log_archive(timestamp DESC);

-- View for recent activity
CREATE OR REPLACE VIEW audit_recent_activity AS
SELECT 
  session_id,
  role,
  tool,
  result,
  COUNT(*) as call_count,
  MAX(timestamp) as last_call,
  AVG(CASE WHEN result = 'error' THEN 1 ELSE 0 END) as error_rate
FROM audit_log
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY session_id, role, tool, result
ORDER BY last_call DESC;

-- View for integrity check
CREATE OR REPLACE VIEW audit_integrity_status AS
SELECT 
  COUNT(*) as total_entries,
  MAX(seq) as max_seq,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(CASE WHEN result = 'error' THEN 1 END) as error_count,
  COUNT(CASE WHEN result = 'ok' THEN 1 END) as success_count
FROM audit_log;

-- Function to archive old logs (retention policy)
CREATE OR REPLACE FUNCTION archive_old_audit_logs(days_retention INT DEFAULT 90)
RETURNS TABLE(archived_count BIGINT) AS $$
DECLARE
  v_count BIGINT;
BEGIN
  INSERT INTO audit_log_archive
  SELECT * FROM audit_log
  WHERE timestamp < NOW() - (days_retention || ' days')::INTERVAL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  DELETE FROM audit_log
  WHERE timestamp < NOW() - (days_retention || ' days')::INTERVAL;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to verify hash chain integrity
CREATE OR REPLACE FUNCTION verify_hash_chain(p_session_id UUID DEFAULT NULL)
RETURNS TABLE(is_valid BOOLEAN, errors TEXT[]) AS $$
DECLARE
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_prev_hash VARCHAR(64) := NULL;
  v_seq BIGINT := 0;
  v_row RECORD;
BEGIN
  FOR v_row IN 
    SELECT hash_chain, previous_hash, seq FROM audit_log
    WHERE (p_session_id IS NULL OR session_id = p_session_id)
    ORDER BY seq ASC
  LOOP
    IF v_row.previous_hash != v_prev_hash THEN
      v_errors := array_append(v_errors, 
        'Hash chain broken at seq ' || v_row.seq || 
        ': expected ' || COALESCE(v_prev_hash, 'null') || 
        ', got ' || COALESCE(v_row.previous_hash, 'null'));
    END IF;
    
    v_prev_hash := v_row.hash_chain;
  END LOOP;

  RETURN QUERY SELECT 
    (array_length(v_errors, 1) IS NULL),
    v_errors;
END;
$$ LANGUAGE plpgsql;

-- Replication publication (for standby databases)
CREATE PUBLICATION IF NOT EXISTS audit_log_pub FOR TABLE audit_log, plans, sessions;

-- Grant permissions
GRANT CONNECT ON DATABASE atlas_gate TO atlas_user;
GRANT USAGE ON SCHEMA public TO atlas_user;
GRANT ALL PRIVILEGES ON TABLE audit_log, sessions, plans, audit_log_archive TO atlas_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO atlas_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO atlas_user;

-- Log initialization
INSERT INTO audit_log (session_id, role, tool, result, notes, hash_chain, seq, args)
VALUES (
  '00000000-0000-0000-0000-000000000000'::UUID,
  'SYSTEM',
  'database_init',
  'ok',
  'Database schema initialized',
  '0000000000000000000000000000000000000000000000000000000000000000',
  0,
  '{"event": "initialization"}'::JSONB
) ON CONFLICT (hash_chain) DO NOTHING;

-- Confirmation
SELECT 'ATLAS-GATE-MCP Database Schema Initialized' as status;
