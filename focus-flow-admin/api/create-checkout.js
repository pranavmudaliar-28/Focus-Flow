import Stripe from 'stripe';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    if (Object.keys(serviceAccount).length > 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is missing. Using default initialization.');
      admin.initializeApp();
    }
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
    admin.initializeApp();
  }
}

const db = admin.firestore();

const PRICE_IDS = {
  starter: 'price_1TeZ4cCeRBK66yLJTsz5n7W6', // Ensure these are valid test prices in your Stripe
  pro:     'price_1TeZ5VCeRBK66yLJwnSb0iln',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan, orgId, email } = req.body;
    
    // In a real production app, you should verify the Firebase ID token here to ensure
    // the user is authorized to create a checkout session for this orgId.
    // For this test project, we will skip the token verification for simplicity.

    const price = PRICE_IDS[plan];
    if (!price || !orgId) {
      return res.status(400).json({ error: 'Invalid plan or organisation.' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Vercel sets VERCEL_URL, but we can also rely on the origin from the request headers
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const base = `${protocol}://${host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      success_url: `${base}/billing?upgraded=${plan}`,
      cancel_url:  `${base}/billing`,
      client_reference_id: orgId,
      customer_email: email || undefined,
      metadata: { orgId, plan },
      subscription_data: { metadata: { orgId, plan } },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: error.message });
  }
}
