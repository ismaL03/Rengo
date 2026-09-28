// Tutoriel d'utilisation et installation sur l'écran d'accueil.
// Utilise les fonctions et variables de index.html ($, icone, stockage, ouvrirFenetre, fermerFenetres, seuils).

const estIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const estAndroid = /android/i.test(navigator.userAgent);
const estInstallee = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let invitationInstallation = null; // proposition d'installation de Chrome (Android, ordinateur)

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  invitationInstallation = e;
  afficherBandeauInstallation();
});
addEventListener('appinstalled', () => { invitationInstallation = null; afficherBandeauInstallation(); });
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));

// Faux boutons, identiques à ceux du site, pour que le tutoriel montre exactement ce qu'il faut toucher
const faux = (nom, texte, classe = '') => `<span class="btn petit faux ${classe}">${nom ? icone(nom, true) : ''}${texte}</span>`;

// ================= Installation =================
function consignesInstallation() {
  if (estInstallee()) return `<p>L'application est déjà installée sur cet appareil.</p>`;
  if (estIOS) {
    return `
      <ol class="pas">
        <li><span class="num">1</span><span>Ouvre ce site dans <b>Safari</b>, puis touche le bouton <b>Partager</b> ${faux('partager', '', 'secondaire carre')} en bas de l'écran (en haut sur iPad).</span></li>
        <li><span class="num">2</span><span>Fais défiler et choisis <b>Sur l'écran d'accueil</b> ${faux('ajout-carre', '', 'secondaire carre')}.</span></li>
        <li><span class="num">3</span><span>Touche <b>Ajouter</b>. L'icône Rengo apparaît sur ton écran d'accueil et s'ouvre en plein écran.</span></li>
      </ol>
      <div class="aide">À la première ouverture depuis l'icône, il faudra retaper le code d'accès une fois.</div>`;
  }
  if (invitationInstallation) {
    return `<p>Installe l'application : elle s'ouvrira en plein écran depuis une icône, comme une vraie application.</p>
      <button type="button" class="btn" data-installer style="width:100%;margin-top:6px">${icone('telecharger', true)}Installer l'application</button>`;
  }
  if (estAndroid) {
    return `
      <ol class="pas">
        <li><span class="num">1</span><span>Dans Chrome, touche le menu ${faux('menu', '', 'secondaire carre')} en haut à droite.</span></li>
        <li><span class="num">2</span><span>Choisis <b>Ajouter à l'écran d'accueil</b> (ou <b>Installer l'application</b>), puis confirme.</span></li>
      </ol>`;
  }
  return `<p>Sur ordinateur, dans Chrome ou Edge, clique sur l'icône d'installation à droite de la barre d'adresse. Sur téléphone, ouvre ce site et suis les instructions de cette fenêtre.</p>`;
}

async function installer() {
  if (!invitationInstallation) return;
  invitationInstallation.prompt();
  await invitationInstallation.userChoice.catch(() => null);
  invitationInstallation = null;
  fermerFenetres();
  afficherBandeauInstallation();
}

function ouvrirInstallation() {
  $('installCorps').innerHTML = consignesInstallation();
  ouvrirFenetre('fenetreInstallation');
}

function afficherBandeauInstallation() {
  const zone = $('bandeauInstallation');
  if (!zone) return;
  const proposer = !estInstallee() && (estIOS || invitationInstallation) && stockage.lire('rengo-tuto') && !stockage.lire('rengo-install-refus');
  zone.innerHTML = proposer
    ? `<div class="bandeau">${icone('telephone')}<span>Installe l'application sur ton ${estIOS ? 'iPhone' : 'téléphone'}</span><span class="espace"></span>
         <button class="btn petit" data-aide="installer">Comment faire</button>
         <button class="btn discret petit carre" data-aide="refuser-installation" title="Ne plus proposer" aria-label="Ne plus proposer">${icone('x', true)}</button></div>`
    : '';
  $('btnAideInstaller').classList.toggle('cache', estInstallee());
}

// ================= Tutoriel =================
const ETAPES_TUTO = [
  {
    icone: 'epingle', titre: 'Bienvenue',
    texte: () => `<p>Ce site rassemble toutes les tirelires de l'association : où elles sont, quand elles ont été vidées, et lesquelles passer voir en priorité.</p>
      <p>Ce guide prend une minute. Tu pourras le revoir dans les Paramètres.</p>`,
  },
  {
    icone: 'carte', titre: 'Carte et couleurs',
    texte: () => `<p>Chaque tirelire est un point sur la carte. Sa couleur dépend du dernier vidage :</p>
      <ul class="legende-tuto">
        <li><span class="point" style="--c:var(--vert)"></span>vidée il y a moins de ${seuils.orange} mois</li>
        <li><span class="point" style="--c:var(--orange)"></span>entre ${seuils.orange} et ${seuils.rouge} mois : à prévoir</li>
        <li><span class="point" style="--c:var(--rouge)"></span>plus de ${seuils.rouge} mois : à vider</li>
        <li><span class="point creux" style="--c:var(--primaire)"></span>commerce repéré, tirelire à poser</li>
        <li><span class="point approx"></span>position approximative, à vérifier</li>
      </ul>
      <p>Touche un compteur en haut (OK, Bientôt, À vider…) pour n'afficher que ces tirelires.</p>`,
  },
  {
    icone: 'goutte', titre: 'Vider une tirelire',
    texte: () => `<p>Sur la fiche d'une tirelire, ou en touchant son point sur la carte, appuie sur ${faux('goutte', 'Vidée')}.</p>
      <p>La date du jour est enregistrée et le point repasse au vert.</p>
      <p>Pour un commerce repéré, ${faux('check', 'Posée', 'succes')} indique que la tirelire est installée.</p>`,
  },
  {
    icone: 'plus', titre: 'Ajouter ou modifier',
    texte: () => `<p>Touche ${faux('plus', '', 'carre')} en haut de l'écran pour ajouter un commerce.</p>
      <p>Devant le commerce, ${faux('viseur', 'Ma position')} place le point sur la carte et remplit l'adresse tout seul.</p>
      <p>Choisis le statut : en place, à poser, refus ou retirée. Tout se change ensuite avec ${faux('crayon', 'Modifier', 'secondaire')}.</p>`,
  },
  {
    icone: 'route', titre: 'Faire une tournée',
    texte: () => `<p>Touche ${faux('route', '', 'secondaire carre')} en haut, choisis la ville et les tirelires à inclure (à vider, bientôt…).</p>
      <p>L'ordre de passage le plus court est calculé depuis ta position. À chaque arrêt : ${faux('goutte', 'Vidée')} ou ${faux('passer', 'Passer', 'secondaire')}.</p>
      <p>Le bouton <b>Ouvrir dans Google Maps</b> lance le GPS vers les prochains arrêts.</p>`,
  },
  {
    icone: 'alerte', titre: 'Positions à vérifier',
    texte: () => `<p>Certaines tirelires ont été placées automatiquement : leur point est en pointillés et elles sont comptées dans <b>À localiser</b>.</p>
      <p>En passant devant, ouvre ${faux('crayon', 'Modifier', 'secondaire')} puis ${faux('viseur', 'Ma position')} : la position devient exacte.</p>`,
  },
  {
    icone: 'telephone', titre: 'Installer sur ton téléphone',
    texte: () => consignesInstallation(),
  },
];
let etapeTuto = 0;

function afficherEtapeTuto() {
  const etape = ETAPES_TUTO[etapeTuto];
  const derniere = etapeTuto === ETAPES_TUTO.length - 1;
  $('tutoCorps').innerHTML = `
    <div class="illustration-tuto">${icone(etape.icone)}</div>
    <h2 id="tutoTitre" class="titre-tuto">${etape.titre}</h2>
    <div class="texte-tuto">${etape.texte()}</div>`;
  $('tutoPoints').innerHTML = ETAPES_TUTO.map((_, i) => `<span class="${i === etapeTuto ? 'actif' : ''}"></span>`).join('');
  $('tutoCompteur').textContent = `${etapeTuto + 1} / ${ETAPES_TUTO.length}`;
  $('tutoPrecedent').textContent = etapeTuto ? 'Précédent' : 'Passer';
  $('tutoSuivant').textContent = derniere ? 'Terminer' : 'Suivant';
  $('tutoCorps').scrollTop = 0;
}

function ouvrirTutoriel() {
  etapeTuto = 0;
  afficherEtapeTuto();
  ouvrirFenetre('fenetreTuto');
}

function terminerTutoriel() {
  stockage.ecrire('rengo-tuto', 'vu');
  fermerFenetres();
  afficherBandeauInstallation();
}

$('tutoSuivant').onclick = () => {
  if (etapeTuto === ETAPES_TUTO.length - 1) return terminerTutoriel();
  etapeTuto++;
  afficherEtapeTuto();
};
$('tutoPrecedent').onclick = () => {
  if (!etapeTuto) return terminerTutoriel();
  etapeTuto--;
  afficherEtapeTuto();
};
// Fermer le tutoriel (croix, Échap, clic à côté) compte comme « vu »
new MutationObserver(() => {
  if ($('fenetreTuto').classList.contains('cache') && !stockage.lire('rengo-tuto')) { stockage.ecrire('rengo-tuto', 'vu'); afficherBandeauInstallation(); }
}).observe($('fenetreTuto'), { attributes: true, attributeFilter: ['class'] });
// Balayage gauche / droite sur téléphone
let departBalayage = null;
$('tutoCorps').addEventListener('touchstart', (e) => (departBalayage = e.touches[0].clientX), { passive: true });
$('tutoCorps').addEventListener('touchend', (e) => {
  if (departBalayage === null) return;
  const ecart = e.changedTouches[0].clientX - departBalayage;
  departBalayage = null;
  if (ecart < -50 && etapeTuto < ETAPES_TUTO.length - 1) { etapeTuto++; afficherEtapeTuto(); }
  if (ecart > 50 && etapeTuto > 0) { etapeTuto--; afficherEtapeTuto(); }
});

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-aide], [data-installer]');
  if (!el) return;
  if (el.hasAttribute('data-installer')) return installer();
  if (el.dataset.aide === 'installer') return ouvrirInstallation();
  if (el.dataset.aide === 'refuser-installation') { stockage.ecrire('rengo-install-refus', '1'); afficherBandeauInstallation(); }
});
$('btnAideTutoriel').onclick = () => { fermerFenetres(); ouvrirTutoriel(); };
$('btnAideInstaller').onclick = () => { fermerFenetres(); ouvrirInstallation(); };

// Appelée par index.html après chaque connexion réussie
function apresConnexion() {
  afficherBandeauInstallation();
  if (!stockage.lire('rengo-tuto')) setTimeout(ouvrirTutoriel, 350);
}
