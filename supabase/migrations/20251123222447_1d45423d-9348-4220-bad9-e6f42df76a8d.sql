-- Add Stripe fields to professional_profiles
ALTER TABLE professional_profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_end_date timestamp with time zone;

-- Create subscription_history table for tracking
CREATE TABLE IF NOT EXISTS subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  plan text NOT NULL,
  status text NOT NULL,
  stripe_subscription_id text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Professionals can view own subscription history
CREATE POLICY "Professionals can view own subscription history"
ON subscription_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM professional_profiles
    WHERE professional_profiles.id = subscription_history.professional_id
    AND professional_profiles.user_id = auth.uid()
  )
);

-- Admins can view all subscription history
CREATE POLICY "Admins can view all subscription history"
ON subscription_history
FOR SELECT
USING (has_role(auth.uid(), 'ADMIN'));

-- Create email_logs table for tracking sent emails
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  email_type text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  brevo_message_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Professionals can view own email logs
CREATE POLICY "Professionals can view own email logs"
ON email_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM professional_profiles
    WHERE professional_profiles.id = email_logs.professional_id
    AND professional_profiles.user_id = auth.uid()
  )
);

-- Admins can view all email logs
CREATE POLICY "Admins can view all email logs"
ON email_logs
FOR SELECT
USING (has_role(auth.uid(), 'ADMIN'));