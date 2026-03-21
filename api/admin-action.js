export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: 'Not configured' });

  try {
    const { action, request_id, access_token } = req.body;
    if (!action || !request_id || !access_token) {
      return res.status(400).json({ error: 'Missing fields: action, request_id, access_token' });
    }

    const { createClient } = await import('@supabase/supabase-js');

    // Verify the user is an admin using their access token
    const userClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || supabaseServiceKey);
    const { data: { user }, error: authError } = await userClient.auth.getUser(access_token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: admin } = await serviceClient.from('admins').select('id').eq('id', user.id).maybeSingle();
    if (!admin) return res.status(403).json({ error: 'Not an admin' });

    // Execute action
    if (action === 'approve') {
      const { data } = await serviceClient.rpc('approve_commercant_request', { p_request_id: request_id });
      return res.status(200).json(data || { success: true });
    } else if (action === 'refuse') {
      const { data } = await serviceClient.rpc('refuse_commercant_request', { p_request_id: request_id });
      return res.status(200).json({ success: !!data });
    } else {
      return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('Admin action error:', error);
    return res.status(500).json({ error: error.message });
  }
}
