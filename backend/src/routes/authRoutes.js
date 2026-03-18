const express = require('express');
const router = express.Router();

/**
 * Start Google OAuth: redirects user to Google account chooser.
 * Expects env:
 *  - GOOGLE_CLIENT_ID
 *  - GOOGLE_REDIRECT_URI (e.g., https://your-backend.com/auth/google/callback)
 */
router.get('/google', (req, res) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    return res
      .status(500)
      .json({ message: 'Google OAuth not configured on server (missing CLIENT_ID / REDIRECT_URI).' });
  }

  const loginHint = req.query.login_hint || '';
  const hd = 'bitsathy.ac.in';

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    access_type: 'offline',
    hd,
  });

  if (loginHint) params.set('login_hint', loginHint);

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

/**
 * OAuth callback placeholder. Exchange code for tokens here if needed.
 * For now, surface the auth code so the frontend can continue flow.
 */
router.get('/google/callback', (req, res) => {
  const { code, scope } = req.query;
  if (!code) return res.status(400).send('Missing authorization code from Google.');
  return res.send(`Google auth received. Code: ${code} Scope: ${scope || ''}`);
});

module.exports = router;
