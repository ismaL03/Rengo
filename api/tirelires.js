// API unique du site : lister (GET), ajouter (POST), marquer vidée (PATCH).
// Protégée par le code d'accès (variable ACCESS_CODE) envoyé dans l'en-tête x-code.
const crypto = require('crypto');

function codeValide(code) {
  const attendu = Buffer.from((process.env.ACCESS_CODE || '').trim());
  const recu = Buffer.from(String(code || ''));
  return attendu.length > 0 && attendu.length === recu.length && crypto.timingSafeEqual(attendu, recu);
}

function supabase(query, options = {}) {
  const key = process.env.SUPABASE_SERVICE_KEY.trim();
  const url = process.env.SUPABASE_URL.trim().replace(/\/$/, '');
  return fetch(`${url}/rest/v1/tirelires${query}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
  });
}

async function repondre(res, reponse) {
  const texte = await reponse.text();
  let data;
  try {
    data = JSON.parse(texte);
  } catch {
    return res.status(500).json({ error: `Supabase a répondu autre chose que du JSON (HTTP ${reponse.status}) : vérifie SUPABASE_URL` });
  }
  res.status(reponse.ok ? 200 : 500).json(reponse.ok ? data : { error: `Supabase : ${data.message || data.error || texte}` });
}

module.exports = async (req, res) => {
  try {
    await traiter(req, res);
  } catch (err) {
    res.status(500).json({ error: `Erreur serveur : ${err.message}` });
  }
};

async function traiter(req, res) {
  if (!codeValide(req.headers['x-code'])) {
    return res.status(401).json({ error: "Code d'accès invalide" });
  }

  if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test((process.env.SUPABASE_URL || '').trim())) {
    return res.status(500).json({ error: 'SUPABASE_URL absente ou incorrecte (attendu : https://xxxx.supabase.co)' });
  }
  if (!process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY absente' });
  }

  if (req.method === 'GET') {
    return repondre(res, await supabase('?select=*&order=date_pose.desc'));
  }

  if (req.method === 'POST') {
    const b = req.body || {};
    const lat = Number(b.lat);
    const lng = Number(b.lng);
    if (!b.entreprise || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'Nom du commerce et position obligatoires' });
    }
    const ligne = {
      entreprise: String(b.entreprise).trim(),
      ville: b.ville ? String(b.ville).trim() : null,
      adresse: b.adresse ? String(b.adresse).trim() : null,
      lat,
      lng,
      date_pose: b.date_pose || undefined,
      notes: b.notes ? String(b.notes).trim() : null,
    };
    return repondre(res, await supabase('', { method: 'POST', body: JSON.stringify(ligne) }));
  }

  if (req.method === 'PATCH') {
    const id = Number(req.query.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id manquant' });
    const b = req.body || {};
    let maj;
    if (b.lat !== undefined || b.lng !== undefined) {
      const lat = Number(b.lat);
      const lng = Number(b.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ error: 'Position invalide' });
      maj = { lat, lng };
    } else {
      maj = { dernier_vidage: b.dernier_vidage || new Date().toISOString().slice(0, 10) };
    }
    return repondre(res, await supabase(`?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(maj) }));
  }

  res.status(405).json({ error: 'Méthode non autorisée' });
}
