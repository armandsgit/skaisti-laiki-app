-- Initialize email_credits for all existing professionals who don't have records
INSERT INTO email_credits (master_id, credits, updated_at)
SELECT 
  pp.id,
  CASE 
    WHEN pp.plan = 'starter' THEN 200
    WHEN pp.plan = 'pro' THEN 1000
    WHEN pp.plan = 'premium' THEN 5000
    ELSE 0
  END as credits,
  NOW()
FROM professional_profiles pp
WHERE pp.subscription_status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM email_credits ec WHERE ec.master_id = pp.id
  );