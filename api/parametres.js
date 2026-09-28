// Réglages partagés par tous les membres : seuils de couleur (en mois).
const { supabase, lireReponse, route } = require('./_lib');

const DEFAUT = { seuil_orange_mois: 3, seuil_rouge_mois: 5 };

module.exports = route(async (req, res) => {
  if (req.method === 'GET') {
    const { ok, data } = await lireReponse(await supabase('parametres?id=eq.1&select=seuil_orange_mois,seuil_rouge_mois'));
    // Table absente (migration pas encore lancée) ou vide : on renvoie les valeurs par défaut.
    if (!ok || !Array.isArray(data) || !data.length) return res.status(200).json({ ...DEFAUT, defaut: true });
    return res.status(200).json({ seuil_orange_mois: Number(data[0].seuil_orange_mois), seuil_rouge_mois: Number(data[0].seuil_rouge_mois) });
  }

  if (req.method === 'PUT') {
    const orange = Number((req.body || {}).seuil_orange_mois);
    const rouge = Number((req.body || {}).seuil_rouge_mois);
    if (!(orange > 0 && rouge > orange && rouge <= 60)) {
      return res.status(400).json({ error: 'Il faut 0 < seuil orange < seuil rouge ≤ 60 mois' });
    }
    const { ok, data } = await lireReponse(await supabase(
      'parametres',
      { method: 'POST', body: JSON.stringify({ id: 1, seuil_orange_mois: orange, seuil_rouge_mois: rouge }) },
      { Prefer: 'resolution=merge-duplicates,return=representation' },
    ));
    if (!ok) {
      const message = (data && data.message) || '';
      const conseil = /parametres/.test(message) ? ' — lance d\'abord migration_v2.sql dans Supabase' : '';
      return res.status(500).json({ error: `Supabase : ${message || 'erreur inconnue'}${conseil}` });
    }
    return res.status(200).json({ seuil_orange_mois: orange, seuil_rouge_mois: rouge });
  }

  res.status(405).json({ error: 'Méthode non autorisée' });
});
