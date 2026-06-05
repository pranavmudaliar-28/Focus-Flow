# Stripe Checkout — Deploy Guide (Firebase Cloud Functions)

Checkout runs through two Cloud Functions in `functions/index.js`:
- **`createCheckoutSession`** — called by the app, creates a Stripe Checkout Session
- **`stripeWebhook`** — Stripe calls this to confirm payment and mark the org `active`

Price IDs are hardcoded in `functions/index.js`:
- Starter `price_1TeZ4cCeRBK66yLJTsz5n7W6`
- Pro `price_1TeZ5VCeRBK66yLJwnSb0iln`

## One-time setup

1. **Upgrade Firebase to the Blaze plan** (Cloud Functions require it):
   https://console.firebase.google.com/project/focus-flow-7e11e → Upgrade.

2. Install function deps:
   ```
   cd functions
   npm install
   cd ..
   ```

3. Authenticate + select project:
   ```
   npx firebase login
   npx firebase use focus-flow-7e11e
   ```

4. Set the Stripe **secret key** (from Stripe → Developers → API keys, `sk_test_...`):
   ```
   npx firebase functions:secrets:set STRIPE_SECRET_KEY
   ```

5. First deploy:
   ```
   npx firebase deploy --only functions
   ```
   Copy the printed **stripeWebhook** URL, e.g.
   `https://us-central1-focus-flow-7e11e.cloudfunctions.net/stripeWebhook`

6. In **Stripe → Developers → Webhooks → Add endpoint**:
   - Endpoint URL = the stripeWebhook URL from step 5
   - Events to send: `checkout.session.completed`, `customer.subscription.deleted`
   - After creating, copy the **Signing secret** (`whsec_...`)

7. Set the webhook secret and redeploy:
   ```
   npx firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
   npx firebase deploy --only functions
   ```

## Done
- Admin clicks **Subscribe** → app calls `createCheckoutSession` → redirects to Stripe's hosted checkout.
- Pay with test card `4242 4242 4242 4242`, any future expiry/CVC.
- Stripe fires `checkout.session.completed` → `stripeWebhook` sets the org `subscriptionStatus: 'active'`.
- Browser returns to `/billing?upgraded=<plan>` → instant optimistic confirmation too.

## Notes
- The `VITE_STRIPE_PUBLISHABLE_KEY` env var is no longer required for checkout (the session is Stripe-hosted).
- To change prices, edit `PRICE_IDS` in `functions/index.js` and redeploy.
- Local dev: checkout requires the deployed functions (or the Firebase emulator). Until deployed, the Subscribe button shows a graceful "Checkout unavailable" toast.
