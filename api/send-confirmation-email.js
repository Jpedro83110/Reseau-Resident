export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const resendKey = process.env.RESEND_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!resendKey || !supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const { carte_id } = req.body;
    if (!carte_id) return res.status(400).json({ error: 'Missing carte_id' });

    // Read everything from DB — no trust on front data
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: carte } = await supabase
      .from('cartes')
      .select('id, numero, prenom, nom_titulaire, email, formule, type_carte, qr_token, ville_id, confirmation_email_sent_at')
      .eq('id', carte_id)
      .single();

    if (!carte) return res.status(404).json({ error: 'Carte not found' });
    if (carte.confirmation_email_sent_at) return res.status(200).json({ already_sent: true });

    const { data: ville } = await supabase.from('villes').select('nom').eq('id', carte.ville_id).single();
    const villeName = ville?.nom || '';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const isDigital = carte.type_carte === 'digitale' || carte.type_carte === 'les_deux';
    const scanUrl = carte.qr_token ? `https://reseau-resident.vercel.app/scan?token=${carte.qr_token}` : null;

    let qrDataUri = null;
    if (isDigital && scanUrl) {
      try {
        const QRCode = (await import('qrcode')).default;
        qrDataUri = await QRCode.toDataURL(scanUrl, { width: 300, margin: 2, color: { dark: '#1a3a5c' } });
      } catch { }
    }

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#faf7f2;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
<div style="text-align:center;margin-bottom:32px;"><div style="display:inline-block;background:#1a3a5c;color:white;font-size:20px;font-weight:bold;padding:8px 20px;border-radius:8px;">Carte Résident</div></div>
<div style="background:white;border-radius:16px;padding:40px 32px;border:1px solid #e5e5e5;">
<h1 style="font-size:28px;color:#1a3a5c;">Bienvenue ${carte.prenom} !</h1>
<p style="font-size:16px;color:#555;">Votre Carte Résident a bien été créée.</p>
<div style="background:linear-gradient(135deg,#1a3a5c,#0d2440);border-radius:16px;padding:24px;color:white;margin:24px 0;">
<div style="font-size:18px;font-weight:bold;margin-bottom:16px;">Carte Résident</div>
<div style="font-family:monospace;font-size:22px;letter-spacing:3px;">${carte.numero}</div>
<div style="font-size:14px;opacity:0.7;margin-top:8px;">${carte.prenom} ${carte.nom_titulaire} · ${villeName}</div>
</div>
${isDigital && qrDataUri ? `<div style="text-align:center;background:#f8f8f8;border-radius:12px;padding:24px;margin:24px 0;">
<div style="font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#1a3a5c;font-weight:bold;margin-bottom:12px;">Votre carte digitale</div>
<img src="${qrDataUri}" width="200" height="200" style="border-radius:8px;" />
<p style="font-size:13px;color:#888;margin-top:12px;">Montrez ce QR code aux commerçants.</p></div>` : ''}
<p style="font-size:14px;color:#888;">Conservez cet email précieusement.</p>
</div></div></body></html>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Carte Résident <${fromEmail}>`,
        to: [carte.email],
        subject: `${carte.prenom}, votre Carte Résident ${carte.numero} est prête !`,
        html,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'Email failed', detail: err.message });
    }

    await supabase.from('cartes').update({ confirmation_email_sent_at: new Date().toISOString() }).eq('id', carte_id);
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({ error: error.message });
  }
}
