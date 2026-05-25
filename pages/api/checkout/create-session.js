// pages/api/checkout/create-session.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res
      .status(405)
      .json({ ok: false, message: 'Méthode non autorisée.' });
  }

  try {
    const {
      items,
      customer,
      shipping,
      notes,
    } = req.body || {};

    // Vérification panier
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        ok: false,
        code: 'EMPTY_CART',
        message: 'Votre panier est vide.',
      });
    }

    // Vérification minimale des lignes
    const normalizedItems = items
      .map((item) => {
        if (!item || typeof item !== 'object') return null;

        const slug =
          typeof item.slug === 'string' && item.slug.trim()
            ? item.slug.trim()
            : null;

        const name =
          typeof item.name === 'string' && item.name.trim()
            ? item.name.trim()
            : null;

        const quantity = Number(item.quantity);
        const price = Number(item.price);

        if (!slug || !name || !Number.isFinite(quantity) || !Number.isFinite(price)) {
          return null;
        }

        if (quantity <= 0 || price < 0) {
          return null;
        }

        return {
          slug,
          name,
          quantity,
          price,
        };
      })
      .filter(Boolean);

    if (!normalizedItems.length) {
      return res.status(400).json({
        ok: false,
        code: 'INVALID_ITEMS',
        message:
          'Les informations du panier sont invalides. Merci de réessayer.',
      });
    }

    // Vérifier si Stripe est configuré (clé secrète)
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET;

    if (!stripeSecretKey) {
      // Mode simulation : pas de clé Stripe → on ne crée pas de vraie session
      // On renvoie une réponse explicite que le front pourra afficher.
      return res.status(200).json({
        ok: false,
        code: 'STRIPE_NOT_CONFIGURED',
        message:
          "Le paiement en ligne n'est pas encore configuré. " +
          'La logique de commande est prête, il ne reste plus qu’à connecter Stripe.',
        // On renvoie quand même un petit récap pour debug éventuel
        debug: {
          itemCount: normalizedItems.length,
          total: normalizedItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          ),
          customer: customer || null,
          shipping: shipping || null,
          notes: notes || '',
        },
      });
    }

    // Si on a une clé, on prépare Stripe.
    // On garde le require ici, il ne sera évalué que si la clé existe.
    // eslint-disable-next-line global-require
    const Stripe = require('stripe');
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Conversion des items en line_items Stripe
    const lineItems = normalizedItems.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.name,
          metadata: {
            slug: item.slug,
          },
        },
        // Stripe attend un montant en centimes
        unit_amount: Math.round(item.price * 100),
      },
    }));

    const origin =
      req.headers.origin ||
      `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;

    // TODO : adapter les URLs de succès / annulation
    const successUrl = `${origin}/?checkout=success`;
    const cancelUrl = `${origin}/panier?checkout=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        // On garde un maximum d’infos utiles dans les metadata
        customer_email: customer?.email || '',
        customer_firstname: customer?.firstName || '',
        customer_lastname: customer?.lastName || '',
        shipping_address: shipping?.address || '',
        shipping_city: shipping?.city || '',
        shipping_zip: shipping?.zip || '',
        shipping_country: shipping?.country || '',
        notes: notes || '',
      },
    });

    return res.status(200).json({
      ok: true,
      code: 'SESSION_CREATED',
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    // Log serveur
    // eslint-disable-next-line no-console
    console.error('CHECKOUT_CREATE_SESSION_ERROR', error);

    return res.status(500).json({
      ok: false,
      code: 'CHECKOUT_ERROR',
      message:
        'Une erreur est survenue lors de la préparation du paiement. Merci de réessayer plus tard.',
    });
  }
}