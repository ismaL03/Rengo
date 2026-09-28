// Tirelires : lister (GET), ajouter (POST), modifier (PATCH ?id=), supprimer (DELETE ?id=).
const { supabase, repondre, route } = require('./_lib');

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const STATUTS = ['a_poser', 'en_place', 'refus', 'retiree'];

// Valide les champs reçus et renvoie { ligne } ou { erreur }.
// En création, le nom est obligatoire ; en modification, seuls les champs envoyés sont changés.
function nettoyer(b, creation) {
  const ligne = {};
  const texte = (v) => (v === null || v === undefined || String(v).trim() === '' ? null : String(v).trim().slice(0, 500));

  if (creation || 'entreprise' in b) {
    ligne.entreprise = texte(b.entreprise);
    if (!ligne.entreprise) return { erreur: 'Le nom du commerce est obligatoire' };
  }
  for (const champ of ['ville', 'adresse', 'notes', 'contact_nom', 'contact_tel', 'horaires']) {
    if (champ in b) ligne[champ] = texte(b[champ]);
  }
  if ('statut' in b) {
    if (!STATUTS.includes(b.statut)) return { erreur: 'Statut invalide' };
    ligne.statut = b.statut;
  }

  if ('lat' in b || 'lng' in b) {
    if (b.lat === null && b.lng === null) {
      ligne.lat = null;
      ligne.lng = null;
    } else {
      const lat = Number(b.lat);
      const lng = Number(b.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return { erreur: 'Position invalide' };
      }
      ligne.lat = lat;
      ligne.lng = lng;
    }
  }

  if ('position_approx' in b) ligne.position_approx = b.position_approx === true;

  if ('date_pose' in b && b.date_pose) {
    if (!DATE.test(b.date_pose)) return { erreur: 'Date de pose invalide' };
    ligne.date_pose = b.date_pose;
  }
  if ('dernier_vidage' in b) {
    if (b.dernier_vidage && !DATE.test(b.dernier_vidage)) return { erreur: 'Date de vidage invalide' };
    ligne.dernier_vidage = b.dernier_vidage || null;
  }
  return { ligne };
}

module.exports = route(async (req, res) => {
  const id = Number(req.query.id);

  if (req.method === 'GET') {
    return repondre(res, await supabase('tirelires?select=*&order=date_pose.desc'));
  }

  if (req.method === 'POST') {
    const { ligne, erreur } = nettoyer(req.body || {}, true);
    if (erreur) return res.status(400).json({ error: erreur });
    return repondre(res, await supabase('tirelires', { method: 'POST', body: JSON.stringify(ligne) }));
  }

  if (req.method === 'PATCH' || req.method === 'DELETE') {
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id manquant' });
  }

  if (req.method === 'PATCH') {
    const { ligne, erreur } = nettoyer(req.body || {}, false);
    if (erreur) return res.status(400).json({ error: erreur });
    if (!Object.keys(ligne).length) return res.status(400).json({ error: 'Rien à modifier' });
    return repondre(res, await supabase(`tirelires?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(ligne) }));
  }

  if (req.method === 'DELETE') {
    return repondre(res, await supabase(`tirelires?id=eq.${id}`, { method: 'DELETE' }));
  }

  res.status(405).json({ error: 'Méthode non autorisée' });
});
