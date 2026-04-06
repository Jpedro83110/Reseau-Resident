// api/send-confirmation-email.js
// Description : Envoie un email de confirmation de carte
// Méthode : POST
// Auth : Bearer token JWT Supabase (propriétaire de la carte)

export const config = { runtime: 'nodejs' };

import { handleCors, createRateLimiter, serverError } from './_utils.js';

const rateLimit = createRateLimiter('send-confirmation-email', { windowMs: 60000, max: 3 });

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (rateLimit(req, res)) return;

  const resendKey = process.env.RESEND_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendFrom =
    process.env.RESEND_FROM_EMAIL || 'Réseaux-Résident <onboarding@resend.dev>';

  if (!resendKey || !supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Serveur mal configuré.' });
  }

  try {
    const { carte_id } = req.body;
    if (!carte_id) {
      return res.status(400).json({ error: 'carte_id requis.' });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: carte, error: carteError } = await supabase
      .from('cartes')
      .select(
        'id, numero, prenom, nom_titulaire, email, formule, type_carte, qr_token, ville_id, confirmation_email_sent_at'
      )
      .eq('id', carte_id)
      .single();

    if (carteError || !carte) {
      return res.status(404).json({ error: 'Carte introuvable.' });
    }

    if (!carte.email) {
      return res.status(400).json({ error: 'Aucun email associé à cette carte.' });
    }

    if (carte.confirmation_email_sent_at) {
      return res.status(200).json({ already_sent: true });
    }

    const { data: ville } = await supabase
      .from('villes')
      .select('nom')
      .eq('id', carte.ville_id)
      .single();

    const villeName = ville?.nom || '';

    const isDigital =
      carte.type_carte === 'digitale' || carte.type_carte === 'les_deux';

    const scanUrl = carte.qr_token
      ? `https://reseaux-resident.fr/scan?token=${encodeURIComponent(carte.qr_token)}`
      : null;

    let qrDataUri = null;
    if (isDigital && scanUrl) {
      try {
        const QRCode = (await import('qrcode')).default;
        qrDataUri = await QRCode.toDataURL(scanUrl, {
          width: 300,
          margin: 2,
          color: { dark: '#1a3a5c', light: '#ffffff' },
        });
      } catch (e) {
        console.error('Erreur génération QR:', e);
      }
    }

    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#1a3a5c;color:white;font-size:20px;font-weight:bold;padding:8px 20px;border-radius:8px;">
        Réseaux-Résident
      </div>
    </div>
    <div style="background:white;border-radius:16px;padding:40px 32px;border:1px solid #e5e5e5;">
      <h1 style="font-size:28px;color:#1a3a5c;">Bienvenue ${carte.prenom || ''} !</h1>
      <p style="font-size:16px;color:#555;">Votre Réseaux-Résident a bien été créée.</p>
      <div style="background:linear-gradient(135deg,#1a3a5c,#0d2440);border-radius:16px;padding:24px;color:white;margin:24px 0;">
        <div style="font-size:18px;font-weight:bold;margin-bottom:16px;">Réseaux-Résident</div>
        <div style="font-family:monospace;font-size:22px;letter-spacing:3px;">${carte.numero || ''}</div>
        <div style="font-size:14px;opacity:0.7;margin-top:8px;">${carte.prenom || ''} ${carte.nom_titulaire || ''} · ${villeName}</div>
      </div>
      ${isDigital && qrDataUri
        ? `<div style="text-align:center;background:#f8f8f8;border-radius:12px;padding:24px;margin:24px 0;">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#1a3a5c;font-weight:bold;margin-bottom:12px;">
              Votre carte digitale
            </div>
            <img src="${qrDataUri}" width="200" height="200" style="border-radius:8px;" />
            <p style="font-size:13px;color:#888;margin-top:12px;">Montrez ce QR code aux commerçants.</p>
          </div>`
        : ''}
      <p style="font-size:14px;color:#888;">Conservez cet email précieusement.</p>
    </div>
  </div>
</body>
</html>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [carte.email],
        subject: `${carte.prenom}, votre Réseaux-Résident ${carte.numero} est prête !`,
        html,
      }),
    });

    if (!response.ok) {
      console.error('Resend error:', await response.text().catch(() => ''));
      return res.status(500).json({ error: 'Échec de l\'envoi de l\'email.' });
    }

    const { error: updateError } = await supabase
      .from('cartes')
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq('id', carte_id);

    if (updateError) {
      console.error('Update confirmation_email_sent_at error:', updateError);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return serverError(res, error, 'send-confirmation-email');
  }
}
