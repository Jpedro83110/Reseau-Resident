export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('RESEND_API_KEY not set');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const { email, prenom, numero, ville, formule, qrToken, typeCarte } = req.body;
    if (!email || !prenom || !numero) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const isDigital = typeCarte === 'digitale' || typeCarte === 'les_deux';
    const scanUrl = qrToken ? `https://reseau-resident.vercel.app/scan?token=${qrToken}` : null;
    const qrImageUrl = scanUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=1a3a5c&bgcolor=ffffff&data=${encodeURIComponent(scanUrl)}` : null;

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:'Helvetica Neue',Arial,sans-serif;color:#1c1c1c;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#1a3a5c;color:white;font-size:20px;font-weight:bold;padding:8px 20px;border-radius:8px;">Carte Résident</div>
    </div>

    <!-- Message -->
    <div style="background:white;border-radius:16px;padding:40px 32px;border:1px solid #e5e5e5;">
      <h1 style="font-size:28px;font-weight:bold;margin:0 0 16px 0;color:#1a3a5c;">Bienvenue ${prenom} !</h1>
      <p style="font-size:16px;line-height:1.6;color:#555;margin:0 0 24px 0;">
        Votre Carte Résident a bien été créée. Voici les détails de votre carte :
      </p>

      <!-- Carte -->
      <div style="background:linear-gradient(135deg,#1a3a5c,#0d2440);border-radius:16px;padding:24px;color:white;margin-bottom:24px;">
        <div style="font-size:18px;font-weight:bold;margin-bottom:16px;">Carte Résident</div>
        <div style="font-family:monospace;font-size:22px;letter-spacing:3px;margin-bottom:8px;">${numero}</div>
        <div style="font-size:14px;opacity:0.7;">
          ${prenom} · ${ville || 'Ma ville'} · ${formule || 'Individuel'}
        </div>
      </div>

      ${isDigital && qrImageUrl ? `
      <!-- QR Code -->
      <div style="text-align:center;background:#f8f8f8;border-radius:12px;padding:24px;margin-bottom:24px;border:1px solid #e5e5e5;">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#1a3a5c;font-weight:bold;margin-bottom:12px;">Votre carte digitale</div>
        <img src="${qrImageUrl}" alt="QR Code Carte Résident" width="200" height="200" style="border-radius:8px;margin-bottom:12px;" />
        <p style="font-size:13px;color:#888;margin:0;">Montrez ce QR code aux commerçants partenaires pour profiter de vos avantages.</p>
      </div>
      ` : ''}

      ${typeCarte !== 'digitale' ? `
      <div style="background:#eff6ff;border-radius:12px;padding:16px;margin-bottom:24px;border:1px solid #dbeafe;">
        <p style="font-size:14px;color:#1a3a5c;margin:0;"><strong>📬 Carte physique</strong> — Elle sera envoyée par courrier sous 5 jours ouvrés.</p>
      </div>
      ` : ''}

      <p style="font-size:14px;color:#888;margin:0;">
        Conservez cet email précieusement. En cas de perte, il contient votre numéro de carte et votre QR code.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:32px;font-size:12px;color:#aaa;">
      <p>Carte Résident — Programme de fidélité locale</p>
      <p>Cet email a été envoyé suite à votre inscription.</p>
    </div>
  </div>
</body>
</html>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Carte Résident <${fromEmail}>`,
        to: [email],
        subject: `${prenom}, votre Carte Résident ${numero} est prête !`,
        html,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'Email sending failed', detail: err.message });
    }

    const result = await response.json();
    return res.status(200).json({ success: true, id: result.id });

  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({ error: error.message });
  }
}
