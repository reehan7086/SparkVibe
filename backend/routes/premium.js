const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Premium tiers
const PREMIUM_TIERS = {
  basic: {
    price: 0,
    features: ['basic_cards', 'limited_shares', 'basic_analytics']
  },
  pro: {
    price: 9.99,
    features: ['unlimited_cards', 'advanced_templates', 'priority_support', 'analytics_dashboard']
  },
  enterprise: {
    price: 29.99,
    features: ['everything_in_pro', 'api_access', 'custom_branding', 'team_features']
  }
};

// Create checkout session
fastify.post('/api/premium/create-checkout', async (request, reply) => {
  try {
    const { tier, userId } = request.body;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `SparkVibe ${tier.toUpperCase()} Plan`,
            description: `Monthly subscription to SparkVibe ${tier} features`
          },
          unit_amount: Math.round(PREMIUM_TIERS[tier].price * 100),
          recurring: {
            interval: 'month'
          }
        },
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/premium/cancel`,
      metadata: {
        userId,
        tier
      }
    });
    
    return reply.send({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return reply.status(500).send({ error: 'Failed to create checkout session' });
  }
});

// Webhook for Stripe events
fastify.post('/api/premium/webhook', async (request, reply) => {
  const sig = request.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        
        // Update user's premium status
        await User.findByIdAndUpdate(session.metadata.userId, {
          premiumTier: session.metadata.tier,
          premiumStartDate: new Date(),
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription
        });
        
        // Send confirmation notification
        await pushNotificationService.sendNotification(
          session.metadata.userId,
          {
            title: 'Welcome to Premium!',
            body: `Your ${session.metadata.tier} subscription is now active`
          }
        );
        break;
        
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        
        // Downgrade user
        await User.findOneAndUpdate(
          { stripeSubscriptionId: subscription.id },
          { 
            premiumTier: 'basic',
            premiumEndDate: new Date()
          }
        );
        break;
    }
    
    return reply.send({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return reply.status(400).send({ error: 'Webhook error' });
  }
});