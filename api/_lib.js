// Outils communs aux fonctions de l'API (le « _ » empêche Vercel d'en faire une route).
const crypto = require('crypto');

function codeValide(code) {
  const attendu = Buffer.from((process.env.ACCESS_CODE || '').trim());
  const recu = Buffer.from(String(code || ''));
  return attendu.length > 0 && attendu.length === recu.length && crypto.timingSafeEqual(attendu, recu);
}

function supabase(chemin, options = {}, entetes = {}) {
  const key = process.env.SUPABASE_SERVICE_KEY.trim();
  const url = process.env.SUPABASE_URL.trim().replace(/\/$/, '');
  return fetch(`${url}/rest/v1/${chemin}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...entetes,
    },
  });
}

async function lireReponse(reponse) {
  const texte = await reponse.text();
  try {
    return { ok: reponse.ok, data: texte ? JSON.parse(texte) : null };
  } catch {
    return { ok: false, data: { message: `Supabase a répondu autre chose que du JSON (HTTP ${reponse.status}) : vérifie SUPABASE_URL` } };
  }
}

async function repondre(res, reponse) {
  const { ok, data } = await lireReponse(reponse);
  if (ok) return res.status(200).json(data);
  const message = (data && (data.message || data.error)) || 'erreur inconnue';
  // Colonne ajoutée par une migration pas encore lancée : on indique laquelle lancer.
  const conseil = /statut|contact_nom|contact_tel|horaires/.test(message) ? ' — lance migration_v3.sql dans Supabase' : '';
  res.status(500).json({ error: `Supabase : ${message}${conseil}` });
}

// Vérifie le code d'accès et la configuration ; renvoie false si une réponse d'erreur a été envoyée.
function controler(req, res) {
  if (!codeValide(req.headers['x-code'])) {
    res.status(401).json({ error: "Code d'accès invalide" });
    return false;
  }
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test((process.env.SUPABASE_URL || '').trim())) {
    res.status(500).json({ error: 'SUPABASE_URL absente ou incorrecte (attendu : https://xxxx.supabase.co)' });
    return false;
  }
  if (!process.env.SUPABASE_SERVICE_KEY) {
    res.status(500).json({ error: 'SUPABASE_SERVICE_KEY absente' });
    return false;
  }
  return true;
}

// Enveloppe chaque route pour renvoyer une erreur lisible au lieu d'un plantage.
function route(traiter) {
  return async (req, res) => {
    try {
      if (controler(req, res)) await traiter(req, res);
    } catch (err) {
      res.status(500).json({ error: `Erreur serveur : ${err.message}` });
    }
  };
}

module.exports = { supabase, lireReponse, repondre, route };
