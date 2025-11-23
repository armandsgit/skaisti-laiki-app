# Stripe & Brevo Setup Guide

## 🔧 Required Configuration

### 1. Stripe Setup

#### Create Products & Prices in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Create 3 products with recurring monthly subscriptions:

   **Starter Plan**
   - Price: €0/month
   - Create a price and copy its ID (e.g., `price_xxxxxxxxxxxxx`)
   
   **Pro Plan**
   - Price: €14.99/month
   - Create a price and copy its ID
   
   **Premium Plan**
   - Price: €24.99/month
   - Create a price and copy its ID

#### Update Code with Price IDs

Open `src/pages/SubscriptionPlans.tsx` and replace the placeholder price IDs:

```typescript
const stripePriceIds: Record<string, string> = {
  starter: 'price_YOUR_STARTER_PRICE_ID',
  pro: 'price_YOUR_PRO_PRICE_ID',
  premium: 'price_YOUR_PREMIUM_PRICE_ID'
};
```

#### Configure Webhook in Stripe

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL:
   ```
   https://drrsbklxmktszxcqahdg.supabase.co/functions/v1/stripe-webhook
   ```
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Webhook Signing Secret** (starts with `whsec_`)

#### Add Secrets to Lovable Cloud

The following secrets are already configured:
- ✅ `STRIPE_SECRET_KEY` - Your Stripe secret key
- ✅ `STRIPE_WEBHOOK_SECRET` - Your webhook signing secret

---

### 2. Brevo Email Setup

#### Create Brevo Account

1. Sign up at [Brevo](https://www.brevo.com)
2. Go to [API Keys](https://app.brevo.com/settings/keys/api)
3. Create a new API key and copy it

#### Verify Sender Email

1. Go to [Senders](https://app.brevo.com/senders)
2. Add your sender email
3. Verify it via the confirmation email

#### Add Secrets to Lovable Cloud

The following secrets are already configured:
- ✅ `BREVO_API_KEY` - Your Brevo API key
- ✅ `BREVO_SENDER_EMAIL` - Your verified sender email

---

## 🚀 How It Works

### Subscription Flow

1. User clicks "Aktivizēt" on a plan
2. System calls `stripe-checkout` edge function
3. Creates/retrieves Stripe customer
4. Creates Stripe Checkout session
5. Redirects user to Stripe payment page
6. After payment:
   - Stripe sends webhook to `stripe-webhook`
   - Updates `professional_profiles` with subscription data
   - Logs subscription in `subscription_history`

### Email Sending Flow

1. Professional sends email via `send-email` edge function
2. System checks email credits
3. Sends email via Brevo API
4. Deducts 1 credit
5. Logs email in `email_logs` and `email_usage`

### Subscription Blocking

Check subscription status before allowing features:

```typescript
const { data: profile } = await supabase
  .from('professional_profiles')
  .select('subscription_status, subscription_end_date')
  .eq('user_id', user.id)
  .single();

if (profile.subscription_status !== 'active') {
  // Block feature access
  toast({
    title: 'Abonements nepieciešams',
    description: 'Aktivizē plānu, lai lietotu šo funkciju',
  });
  navigate('/subscription-plans');
}
```

---

## 📊 Database Tables

### `professional_profiles`
- `stripe_customer_id` - Stripe customer ID
- `stripe_subscription_id` - Current subscription ID
- `subscription_end_date` - When subscription expires
- `plan` - Current plan (starter/pro/premium)
- `subscription_status` - active/inactive

### `subscription_history`
- Logs all subscription changes
- Tracks start/end dates

### `email_credits`
- Tracks available email credits per professional

### `email_logs`
- Logs all sent emails with Brevo message IDs

---

## 🔍 Testing

### Test Stripe Payments

Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

### Test Webhooks Locally

Use Stripe CLI:
```bash
stripe listen --forward-to https://drrsbklxmktszxcqahdg.supabase.co/functions/v1/stripe-webhook
```

### Test Email Sending

Call the edge function:
```typescript
const { data, error } = await supabase.functions.invoke('send-email', {
  body: {
    professionalId: 'uuid',
    to: 'client@example.com',
    subject: 'Test Email',
    htmlContent: '<h1>Hello!</h1>',
    emailType: 'test'
  }
});
```

---

## 📱 UI Pages

### `/subscription-plans`
- View and select subscription plans
- Redirects to Stripe Checkout

### `/billing`
- View current subscription status
- View email credits and usage
- View subscription history
- Purchase email credits

### Professional Dashboard
- Shows subscription status indicator
- Displays email credits
- Purchase email credits modal

---

## ⚠️ Important Notes

1. **Replace Price IDs** in `SubscriptionPlans.tsx` with your actual Stripe price IDs
2. **Test Mode**: Start with Stripe test mode before going live
3. **Webhook Secret**: Keep your webhook secret secure
4. **Email Credits**: Default is 0, users must purchase credits
5. **Subscription Expiry**: Implement cron job to check expired subscriptions

---

## 🆘 Troubleshooting

### Webhook not receiving events
- Check webhook URL is correct
- Verify webhook secret matches
- Check Stripe logs in dashboard

### Email not sending
- Verify Brevo API key is correct
- Check sender email is verified
- Ensure professional has credits

### Checkout session fails
- Verify price IDs are correct
- Check Stripe API key is valid
- Review edge function logs
