export const config = {
  runtime: 'nodejs',
  api: { bodyParser: false },
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  // Pas de CORS sur le webhook Stripe — appelé serveur-à-serveur
  if (req.method !== 'POST') return res.status(405).end();

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars for webhook');
    return res.status(500).json({ error: 'Erreur serveur.' });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    let event;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET non défini — webhook rejeté.');
      return res.status(500).json({ error: 'Erreur serveur.' });
    }
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Gestion des events subscription (premium commerçant) ──
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.mode === 'subscription' && session.metadata?.commerce_id) {
        await supabase.from('commerces').update({
          premium: true,
          premium_depuis: new Date().toISOString(),
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
        }).eq('id', session.metadata.commerce_id);
      }
      return res.status(200).json({ received: true, action: 'subscription_activated' });
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      if (subscription.metadata?.commerce_id) {
        await supabase.from('commerces').update({
          premium: false,
          stripe_subscription_id: null,
        }).eq('id', subscription.metadata.commerce_id);
      } else if (subscription.customer) {
        await supabase.from('commerces').update({
          premium: false,
          stripe_subscription_id: null,
        }).eq('stripe_customer_id', subscription.customer);
      }
      return res.status(200).json({ received: true, action: 'subscription_cancelled' });
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
        console.error(`Abonnement impayé: ${subscription.id} (commerce: ${subscription.metadata?.commerce_id})`);
      }
      return res.status(200).json({ received: true, action: 'subscription_updated' });
    }

    // ── Gestion du paiement carte physique ──
    if (event.type !== 'payment_intent.succeeded') {
      return res.status(200).json({ received: true, skipped: event.type });
    }

    const pi = event.data.object;
    const carteId = pi.metadata?.carte_id;

    if (!carteId) {
      console.error('No carte_id in PI metadata');
      return res.status(200).json({ received: true, error: 'no_carte_id' });
    }

    // Idempotence check
    const { data: existing } = await supabase
      .from('stripe_webhook_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .maybeSingle();

    if (existing) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    await supabase.from('stripe_webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: { carte_id: carteId, amount: pi.amount, email: pi.receipt_email },
    });

    const { data: activated } = await supabase.rpc('activate_carte_after_payment', {
      p_carte_id: carteId,
      p_stripe_pi: pi.id,
    });

    const { data: carte } = await supabase
      .from('cartes')
      .select('commande_groupe_id')
      .eq('id', carteId)
      .single();

    if (carte?.commande_groupe_id) {
      await supabase
        .from('cartes')
        .update({ statut: 'active', stripe_payment_intent_id: pi.id, payment_confirmed_at: new Date().toISOString() })
        .eq('commande_groupe_id', carte.commande_groupe_id)
        .eq('statut', 'en_attente_paiement');
    }

    // Envoi email de confirmation (non-bloquant)
    try {
      const resendKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

      if (resendKey) {
        const { data: carteData } = await supabase
          .from('cartes')
          .select('numero, prenom, nom_titulaire, email, formule, type_carte, qr_token, ville_id')
          .eq('id', carteId)
          .single();

        if (carteData) {
          const { data: villeData } = await supabase
            .from('villes')
            .select('nom')
            .eq('id', carteData.ville_id)
            .single();

          const villeName = villeData?.nom || '';
          const isDigital = carteData.type_carte === 'digitale' || carteData.type_carte === 'les_deux';
          const appUrl = process.env.APP_URL || process.env.VITE_APP_URL || 'https://reseaux-resident.fr';
          const scanUrl = carteData.qr_token ? `${appUrl}/scan?token=${carteData.qr_token}` : null;

          let qrDataUri = null;
          if (isDigital && scanUrl) {
            try {
              const QRCode = (await import('qrcode')).default;
              qrDataUri = await QRCode.toDataURL(scanUrl, { width: 300, margin: 2, color: { dark: '#1a3a5c' } });
            } catch { }
          }

          const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#faf7f2;font-family:Arial,sans-serif;color:#1c1c1c;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
<div style="text-align:center;margin-bottom:32px;"><div style="display:inline-block;background:#1a3a5c;color:white;font-size:20px;font-weight:bold;padding:8px 20px;border-radius:8px;">Réseaux-Résident</div></div>
<div style="background:white;border-radius:16px;padding:40px 32px;border:1px solid #e5e5e5;">
<h1 style="font-size:28px;font-weight:bold;margin:0 0 16px;color:#1a3a5c;">Bienvenue ${carteData.prenom} !</h1>
<p style="font-size:16px;line-height:1.6;color:#555;">Votre Réseaux-Résident a bien été créée.</p>
<div style="background:linear-gradient(135deg,#1a3a5c,#0d2440);border-radius:16px;padding:24px;color:white;margin:24px 0;">
<div style="font-size:18px;font-weight:bold;margin-bottom:16px;">Réseaux-Résident</div>
<div style="font-family:monospace;font-size:22px;letter-spacing:3px;margin-bottom:8px;">${carteData.numero}</div>
<div style="font-size:14px;opacity:0.7;">${carteData.prenom} ${carteData.nom_titulaire} · ${villeName} · ${carteData.formule}</div>
</div>
${isDigital && qrDataUri ? `<div style="text-align:center;background:#f8f8f8;border-radius:12px;padding:24px;margin:24px 0;border:1px solid #e5e5e5;">
<div style="font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#1a3a5c;font-weight:bold;margin-bottom:12px;">Votre carte digitale</div>
<img src="${qrDataUri}" alt="QR Code" width="200" height="200" style="border-radius:8px;margin-bottom:12px;" />
<p style="font-size:13px;color:#888;margin:0;">Montrez ce QR code aux commerçants partenaires.</p></div>` : ''}
<p style="font-size:14px;color:#888;">Conservez cet email. Il contient votre numéro de carte${isDigital ? ' et votre QR code' : ''}.</p>
</div>
<div style="text-align:center;margin-top:32px;font-size:12px;color:#aaa;"><p>Réseaux-Résident — Programme de fidélité locale</p></div>
</div></body></html>`;

          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: `Réseaux-Résident <${fromEmail}>`,
              to: [carteData.email],
              subject: `${carteData.prenom}, votre Réseaux-Résident ${carteData.numero} est prête !`,
              html,
            }),
          });

          if (emailRes.ok) {
            await supabase.from('cartes').update({ confirmation_email_sent_at: new Date().toISOString() }).eq('id', carteId);
          } else {
            console.error('Email non envoyé — Resend status:', emailRes.status);
          }
        }
      }
    } catch (emailErr) {
      console.error('Email error (non-blocking):', emailErr.message);
    }

    return res.status(200).json({ received: true, activated: !!activated });

  } catch (error) {
    console.error('Webhook error:', error.message);
    return res.status(400).json({ error: 'Erreur de validation du webhook.' });
  }
}
