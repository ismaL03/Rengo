// Localisation automatique des tirelires sans position GPS.
// S'exécute dans le navigateur (utilise les variables et fonctions de index.html).
//   1. par le nom du commerce dans sa ville (OpenStreetMap : Photon puis Nominatim) ;
//   2. à côté d'une autre tirelire quand le nom le dit (« collée à », « en face de », « à côté de »…) ;
//   3. à défaut, dans la zone de la ville (position approximative, à vérifier).
// Rien n'est enregistré avant validation.

const Localisation = (() => {
  // Code postal des villes de la base, pour ne pas confondre des homonymes (Marly, Saint-Maximin…)
  const COMMUNES = {
    'compiegne': ['Compiègne', '60200'], 'creil': ['Creil', '60100'], 'st maximin': ['Saint-Maximin', '60740'],
    'pont st maxence': ['Pont-Sainte-Maxence', '60700'], 'chambly': ['Chambly', '60230'], 'persan': ['Persan', '95340'],
    'beaumont sur oise': ['Beaumont-sur-Oise', '95260'], "saint leu d'esserent": ["Saint-Leu-d'Esserent", '60340'],
    'saint denis': ['Saint-Denis', '93200'], 'saint-denis': ['Saint-Denis', '93200'],
    'pierrefite sur seine': ['Pierrefitte-sur-Seine', '93380'], 'aubervilliers': ['Aubervilliers', '93300'],
    'villetaneuse': ['Villetaneuse', '93430'], 'montmagny': ['Montmagny', '95360'], 'sarcelles': ['Sarcelles', '95200'],
    'le plessis-belleville': ['Le Plessis-Belleville', '60330'], 'saint soupplet': ['Saint-Soupplets', '77165'],
    'meaux': ['Meaux', '77100'], 'monthyon': ['Monthyon', '77122'], 'drancy': ['Drancy', '93700'], 'bondy': ['Bondy', '93140'],
    'nogent-sur-oise': ['Nogent-sur-Oise', '60180'], 'fosses': ['Fosses', '95470'], 'louvre': ['Louvres', '95380'],
    'marly': ['Marly-la-Ville', '95670'], 'mantes la jolie': ['Mantes-la-Jolie', '78200'], 'goussainville': ['Goussainville', '95190'],
  };

  // Mots trop courants pour identifier un commerce à eux seuls
  const GENERIQUES = new Set(('boulangerie boucherie patisserie epicerie alimentation generale primeur restaurant resto pizza pizzeria ' +
    'kebab tacos burger burgers food snack bar cafe coiffeur coiffure barber barbier shop salon the chez la le les de du des au aux ' +
    'et un une l d en artisan artisanal artisanale artisant fabrication fruits legumes market bazar cosmetique beaute ' +
    'traiteur grec oriental rotisserie viande poulet braise fast').split(' '));

  const normaliser = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’`]/g, "'").replace(/[^a-z0-9' -]/g, ' ').replace(/\s+/g, ' ').trim();
  const motsSignificatifs = (s) => normaliser(s).split(/[ '-]/).filter((m) => m.length >= 3 && !GENERIQUES.has(m));
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));

  // Sépare « Boulangerie collée à Maison Aya » en { recherche: 'boulangerie', reference: 'maison aya' }.
  // Le texte entre parenthèses complète le nom (« Coiffeur (le salam) ») ou situe le commerce (« (en face de Islafood) »).
  const VOISINAGE = /^(.*?)\s*\b(?:coll(?:e|er|ee|es)|a cote|cote|en face|face|pres)\b\s*(?:de la |de l'|de |du |des |a la |a l'|a |au |aux |d')?(.+)$/;
  function analyserNom(nom) {
    const dedans = [];
    const principal = String(nom).replace(/\(([^)]*)\)/g, (m, x) => { dedans.push(x); return ' '; });
    const nettoyer = (x) => normaliser(x).replace(/\b(ferme|a supprime)\b ?\??/g, ' ').replace(/\s+/g, ' ').trim();
    let recherche = nettoyer(principal), reference = null;
    const m = recherche.match(VOISINAGE);
    if (m && m[1]) { recherche = m[1].trim(); reference = m[2].trim(); }
    for (const x of dedans.map(nettoyer).filter(Boolean)) {
      const mx = x.match(VOISINAGE);
      if (mx) reference = reference || mx[2].trim();
      else recherche += ' ' + x;
    }
    return { recherche: recherche.trim(), reference };
  }

  // Le nom trouvé sur la carte correspond-il au commerce cherché ?
  function nomsCorrespondent(cherche, trouve) {
    const a = motsSignificatifs(cherche);
    const b = new Set(motsSignificatifs(trouve));
    if (!a.length) return false;
    const communs = a.filter((m) => b.has(m)).length;
    return communs >= Math.max(1, Math.ceil(a.length / 2));
  }

  async function lireJson(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  // Centre de la commune (Géoplateforme IGN, puis ancienne API Adresse)
  async function centreCommune(ville) {
    const [nom, cp] = COMMUNES[normaliser(ville)] || [ville, ''];
    const params = `q=${encodeURIComponent(nom)}&type=municipality&limit=1${cp ? '&postcode=' + cp : ''}`;
    for (const base of ['https://data.geopf.fr/geocodage/search?index=address&', 'https://api-adresse.data.gouv.fr/search/?']) {
      try {
        const d = await lireJson(base + params);
        const f = d.features && d.features[0];
        if (f) return { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
      } catch {}
    }
    return null;
  }

  const adresseOsm = (p) => [[p.housenumber, p.street].filter(Boolean).join(' '), [p.postcode, p.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');

  // Recherche d'un commerce par son nom autour d'un point (≈ 6 km)
  async function chercherCommerce(nom, autour) {
    const bbox = [autour.lng - 0.08, autour.lat - 0.055, autour.lng + 0.08, autour.lat + 0.055];
    const exclus = ['highway', 'place', 'boundary', 'landuse', 'natural', 'railway', 'waterway'];
    try {
      const d = await lireJson(`https://photon.komoot.io/api/?q=${encodeURIComponent(nom)}&lang=fr&limit=8&bbox=${bbox.join(',')}`);
      const f = (d.features || []).find((x) => x.properties.name && !exclus.includes(x.properties.osm_key) && nomsCorrespondent(nom, x.properties.name));
      if (f) return { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], adresse: adresseOsm(f.properties), trouve: f.properties.name };
    } catch {}
    await pause(1100); // Nominatim : 1 requête par seconde au maximum
    try {
      const d = await lireJson(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&accept-language=fr&limit=8&bounded=1&viewbox=${bbox[0]},${bbox[3]},${bbox[2]},${bbox[1]}&q=${encodeURIComponent(nom)}`);
      const r = d.find((x) => x.name && !exclus.includes(x.category) && nomsCorrespondent(nom, x.name));
      if (r) {
        const a = r.address || {};
        const p = { housenumber: a.house_number, street: a.road || a.pedestrian, postcode: a.postcode, city: a.city || a.town || a.village };
        return { lat: Number(r.lat), lng: Number(r.lon), adresse: adresseOsm(p), trouve: r.name };
      }
    } catch {}
    return null;
  }

  // Petit décalage pour que des points au même endroit ne se superposent pas
  function decaler(p, rang, pas) {
    if (!rang) return { lat: p.lat, lng: p.lng };
    const angle = rang * 2.399963, rayon = pas * Math.sqrt(rang);
    return { lat: p.lat + rayon * Math.sin(angle), lng: p.lng + (rayon * Math.cos(angle)) / Math.cos((p.lat * Math.PI) / 180) };
  }

  // Calcule une proposition pour chaque tirelire sans position. suivi(message, fait, total) affiche la progression.
  async function proposer(liste, suivi) {
    const aTraiter = liste.filter((t) => !aPosition(t));
    const resultats = new Map(); // id -> { t, lat, lng, adresse, methode, detail }
    const positionDe = (t) => (aPosition(t) ? t : resultats.get(t.id));

    // Centre de chaque ville : moyenne des tirelires déjà placées, sinon centre de la commune
    const centres = {};
    for (const ville of [...new Set(aTraiter.map((t) => t.ville).filter(Boolean))]) {
      const placees = liste.filter((t) => t.ville === ville && aPosition(t) && !t.position_approx);
      centres[ville] = placees.length
        ? { lat: placees.reduce((s, t) => s + t.lat, 0) / placees.length, lng: placees.reduce((s, t) => s + t.lng, 0) / placees.length, source: 'tirelires' }
        : await centreCommune(ville).then((c) => c && { ...c, source: 'commune' });
    }

    // 1. Par le nom du commerce
    let fait = 0;
    for (const t of aTraiter) {
      suivi(`Recherche de « ${t.entreprise} »…`, fait++, aTraiter.length);
      const centre = centres[t.ville];
      const { recherche } = analyserNom(t.entreprise);
      if (!centre || !motsSignificatifs(recherche).length) continue; // nom trop générique : on ne devine pas
      const r = await chercherCommerce(recherche, centre);
      if (r) resultats.set(t.id, { t, ...r, methode: 'nom', detail: `Trouvée sur la carte : « ${r.trouve} »` });
      await pause(250);
    }
    suivi('Placement à côté des tirelires voisines…', aTraiter.length, aTraiter.length);

    // 2. À côté d'une autre tirelire citée dans le nom (plusieurs passes pour les références en chaîne)
    const voisins = {};
    for (let passe = 0; passe < 3; passe++) {
      for (const t of aTraiter) {
        if (resultats.has(t.id)) continue;
        const { reference } = analyserNom(t.entreprise);
        if (!reference) continue;
        const cible = liste.find((x) => x.id !== t.id && x.ville === t.ville && positionDe(x) &&
          (normaliser(x.entreprise).includes(reference) || (reference.length >= 4 && reference.includes(normaliser(x.entreprise).replace(/\s*\(.*$/, '')))));
        if (!cible) continue;
        const rang = (voisins[cible.id] = (voisins[cible.id] || 0) + 1);
        resultats.set(t.id, { t, ...decaler(positionDe(cible), rang, 0.00012), methode: 'voisine', detail: `À côté de « ${cible.entreprise} »` });
      }
    }
    // Commerce voisin cité dans le nom mais qui n'est pas une tirelire : on le cherche sur la carte
    for (const t of aTraiter) {
      const { reference } = analyserNom(t.entreprise);
      if (resultats.has(t.id) || !reference || !centres[t.ville] || !motsSignificatifs(reference).length) continue;
      suivi(`Recherche du voisin « ${reference} »…`, aTraiter.length, aTraiter.length);
      const r = await chercherCommerce(reference, centres[t.ville]);
      if (r) resultats.set(t.id, { t, ...decaler(r, 1, 0.00012), methode: 'voisine', detail: `À côté de « ${r.trouve} » (trouvé sur la carte)` });
      await pause(250);
    }

    // 3. Dans la zone de la ville (approximatif)
    const rangs = {};
    for (const t of aTraiter) {
      if (resultats.has(t.id) || !centres[t.ville]) continue;
      const rang = (rangs[t.ville] = (rangs[t.ville] || 0) + 1);
      const c = centres[t.ville];
      resultats.set(t.id, {
        t, ...decaler(c, rang, 0.0007), methode: 'zone',
        detail: c.source === 'tirelires' ? `Zone des autres tirelires de ${t.ville}` : `Centre de ${t.ville}`,
      });
    }

    return {
      propositions: aTraiter.filter((t) => resultats.has(t.id)).map((t) => resultats.get(t.id)),
      introuvables: aTraiter.filter((t) => !resultats.has(t.id)),
    };
  }

  return { proposer, analyserNom, nomsCorrespondent };
})();

// ================= Interface =================
(() => {
  let propositions = [];
  const METHODES = {
    nom: { icone: '🏪', libelle: 'Trouvée par son nom' },
    voisine: { icone: '🔗', libelle: "À côté d'une autre tirelire" },
    zone: { icone: '🏙️', libelle: 'Zone de la ville (approximatif)' },
  };

  window.ouvrirLocalisation = () => {
    const sans = tirelires.filter((t) => !aPosition(t));
    $('locEtape1').classList.remove('cache');
    $('locEtape2').classList.add('cache');
    $('locEtape3').classList.add('cache');
    $('locPied').innerHTML = `<span class="espace"></span><button type="button" class="btn leger" data-fermer-loc>Annuler</button>
      <button type="button" class="btn degrade" id="btnLancerLoc" ${sans.length && v4 ? '' : 'disabled'}>🔎 Lancer la recherche</button>`;
    $('locNombre').textContent = pluriel(sans.length, 'tirelire');
    $('locMigration').classList.toggle('cache', v4);
    ouvrirFenetre('fenetreLocalisation');
  };

  $('fenetreLocalisation').addEventListener('click', async (e) => {
    if (e.target.closest('[data-fermer-loc]')) return fermerFenetres();
    if (e.target.closest('#btnLancerLoc')) return lancer();
    if (e.target.closest('#btnEnregistrerLoc')) return enregistrer();
    const tout = e.target.closest('[data-tout]');
    if (tout) e.preventDefault();
    if (tout) document.querySelectorAll(`#locResultats input[data-methode="${tout.dataset.tout}"]`).forEach((c) => (c.checked = tout.dataset.valeur === '1'));
    majCompte();
  });

  function majCompte() {
    const n = document.querySelectorAll('#locResultats input:checked').length;
    const b = $('btnEnregistrerLoc');
    if (b) { b.textContent = `Enregistrer ${pluriel(n, 'position')}`; b.disabled = !n; }
  }

  async function lancer() {
    $('locEtape1').classList.add('cache');
    $('locEtape2').classList.remove('cache');
    $('locPied').innerHTML = '<span class="espace"></span><button type="button" class="btn leger" data-fermer-loc>Annuler</button>';
    let annule = false;
    $('locPied').querySelector('[data-fermer-loc]').addEventListener('click', () => (annule = true), { once: true });
    const res = await Localisation.proposer(tirelires, (message, fait, total) => {
      if (annule) throw new Error('annulé');
      $('locMessage').textContent = message;
      $('locBarre').style.width = `${Math.round((100 * fait) / Math.max(total, 1))}%`;
      $('locAvancement').textContent = `${fait} / ${total}`;
    }).catch((err) => (err.message === 'annulé' ? null : Promise.reject(err)));
    if (!res) return;
    propositions = res.propositions;
    afficherResultats(res.introuvables);
  }

  function afficherResultats(introuvables) {
    $('locEtape2').classList.add('cache');
    $('locEtape3').classList.remove('cache');
    const groupes = ['nom', 'voisine', 'zone'].map((m) => [m, propositions.filter((p) => p.methode === m)]).filter(([, l]) => l.length);
    $('locResume').innerHTML = groupes.map(([m, l]) => `<div>${METHODES[m].icone} <b>${l.length}</b> ${METHODES[m].libelle.toLowerCase()}</div>`).join('') +
      (introuvables.length ? `<div>❔ <b>${introuvables.length}</b> sans ville connue : à placer à la main</div>` : '');
    $('locResultats').innerHTML = groupes.map(([m, l]) => `
      <div class="section" style="display:flex;align-items:center;gap:8px">${METHODES[m].icone} ${METHODES[m].libelle} (${l.length})
        <span class="espace" style="flex:1"></span>
        <a href="#" data-tout="${m}" data-valeur="1" style="font-size:12px;text-transform:none;letter-spacing:0;white-space:nowrap">tout cocher</a>
        <a href="#" data-tout="${m}" data-valeur="0" style="font-size:12px;text-transform:none;letter-spacing:0;white-space:nowrap">tout décocher</a>
      </div>
      ${l.map((p) => `
        <label class="ligne-loc">
          <input type="checkbox" data-id="${p.t.id}" data-methode="${m}" checked>
          <span><b>${echapper(p.t.entreprise)}</b> · ${echapper(p.t.ville || '')}<br>
          <small>${echapper(p.detail)}${p.adresse ? ' · ' + echapper(p.adresse) : ''}</small></span>
        </label>`).join('')}`).join('');
    $('locPied').innerHTML = `<span class="espace"></span><button type="button" class="btn leger" data-fermer-loc>Annuler</button>
      <button type="button" class="btn degrade" id="btnEnregistrerLoc">Enregistrer</button>`;
    majCompte();
  }

  async function enregistrer() {
    const ids = new Set([...document.querySelectorAll('#locResultats input:checked')].map((c) => Number(c.dataset.id)));
    const choisies = propositions.filter((p) => ids.has(p.t.id));
    const bouton = $('btnEnregistrerLoc');
    bouton.disabled = true;
    let faites = 0, erreurs = 0;
    // 4 enregistrements en parallèle
    const file = [...choisies];
    await Promise.all(Array.from({ length: 4 }, async () => {
      for (let p; (p = file.shift());) {
        const champs = { lat: p.lat, lng: p.lng, position_approx: p.methode !== 'nom' };
        if (p.adresse && !p.t.adresse) champs.adresse = p.adresse;
        try { await modifier(p.t, champs); faites++; } catch { erreurs++; }
        bouton.textContent = `Enregistrement… ${faites + erreurs} / ${choisies.length}`;
      }
    }));
    fermerFenetres();
    rafraichir(true);
    toast(erreurs ? `⚠️ ${faites} positions enregistrées, ${erreurs} en erreur` : `✅ ${pluriel(faites, 'position')} enregistrée${faites > 1 ? 's' : ''}`);
  }

})();
