# Tirelires Rengo 🏛️

Mini-site pour les membres de l'association : voir les tirelires sur une carte,
depuis quand elles sont posées, quand elles ont été vidées, et en ajouter.
Accès protégé par un code unique.

- **Site** : `index.html` (une seule page, carte Leaflet/OpenStreetMap)
- **API** : `api/tirelires.js` (fonction serverless Vercel, vérifie le code d'accès)
- **Base de données** : Supabase (Postgres gratuit), table créée par `supabase.sql`

Code couleur (réglable dans ⚙️ Paramètres) : 🟢 vidée il y a moins de 3 mois · 🟠 3 à 5 mois · 🔴 plus de 5 mois
(si jamais vidée, on compte depuis la date de pose).

## Mise en ligne (≈ 15 min, gratuit)

### 1. Créer la base de données (Supabase)
1. Crée un compte sur https://supabase.com → **New project** (région : Paris / eu-west-3).
2. Menu **SQL Editor** → **New query** → colle le contenu de `supabase.sql` → **Run**.
3. Menu **Project Settings → API** : note
   - `Project URL` (ex. `https://abcd.supabase.co`)
   - la clé **`service_role`** (secrète ! ne jamais la mettre dans `index.html`).

### 2. Mettre le site en ligne (Vercel)
1. Crée un compte sur https://vercel.com avec ton compte GitHub.
2. **Add New → Project** → importe le dépôt `Rengo` → **Deploy** (aucun réglage à changer).
3. Dans le projet Vercel → **Settings → Environment Variables**, ajoute :

   | Nom | Valeur |
   |---|---|
   | `SUPABASE_URL` | l'URL du projet Supabase |
   | `SUPABASE_SERVICE_KEY` | la clé `service_role` |
   | `ACCESS_CODE` | le code que tu donneras aux membres (ex. `Rengo2026!`) |

4. **Deployments → ⋯ → Redeploy** pour que les variables soient prises en compte.
5. Ouvre l'URL (ex. `rengo.vercel.app`), tape le code : c'est prêt. Sur téléphone,
   « Ajouter à l'écran d'accueil » pour l'avoir comme une appli.

Pour changer le code d'accès : modifie `ACCESS_CODE` dans Vercel puis *Redeploy*.

### 3. Importer les tirelires existantes de Notion
Dans Supabase → **SQL Editor** → **New query**, colle le contenu de `migration_notion.sql` → **Run**.
Le script ajoute les 206 tirelires de la base Notion **🏛️ Tirelires Rengo** et peut être relancé
sans créer de doublons. Celles qui n'avaient pas de position GPS dans Notion apparaissent dans la
liste avec un bouton **📍 Placer** pour les mettre sur la carte.

### 4. Activer les paramètres (seuils de couleur)
Dans Supabase → **SQL Editor**, colle le contenu de `migration_v2.sql` → **Run** (une seule fois).
Sans cette étape, le site fonctionne avec les seuils par défaut (3 et 5 mois) mais ne peut pas les enregistrer.

### 5. Activer les statuts et le contact du commerçant
Dans Supabase → **SQL Editor**, colle le contenu de `migration_v3.sql` → **Run** (une seule fois).
Toutes les tirelires existantes passent au statut « En place ». Sans cette étape, le site reste
utilisable mais les statuts et le contact sont masqués.

### 6. Positions approximatives
Dans Supabase → **SQL Editor**, colle le contenu de `migration_v4.sql` → **Run** (une seule fois).
Cela permet à l'outil « Localiser automatiquement » de marquer les positions à vérifier.

## Utilisation
- **Compteurs en haut** : total, 🟢 OK, 🟠 bientôt, 🔴 à vider, sans GPS. Un clic filtre la liste et la carte.
- **Carte** : un point par tirelire, couleur = temps écoulé depuis le dernier vidage (ou la pose).
  Un clic ouvre une bulle avec 💧 Vidée, ✏️ Modifier et 🧭 itinéraire.
- **Liste** : recherche (nom, ville, adresse, notes), filtre par ville, tri (plus urgentes, récentes, nom, ville).
  Chaque fiche indique depuis quand elle est posée, vidée, et la date limite du prochain passage.
- **＋ Nouvelle tirelire** / **✏️ Modifier** : tous les champs sont modifiables. Pour la position :
  📍 *Utiliser ma position* (GPS du téléphone, l'adresse se remplit toute seule), toucher la mini-carte
  puis glisser le repère, ou 🔎 *Depuis l'adresse*. La suppression se fait depuis cette fenêtre.
- **Statuts** : 🟢 En place, 🎯 À poser (repérage), ❌ Refus, 🔁 Retirée. Par défaut la liste montre les
  tirelires actives (en place + à poser) ; le menu « Statut » affiche les refus et les retirées.
  Sur une tirelire à poser, **✅ Posée** la passe en place avec la date du jour.
- **Contact du commerçant** : nom, téléphone (bouton 📞 Appeler) et horaires d'ouverture.
- **🧭 Tournée** : choisis une ville et les tirelires à inclure (à vider, bientôt, OK, à poser).
  L'ordre de passage est calculé pour minimiser la distance depuis ta position. Pendant la tournée :
  carte numérotée avec le trajet, 💧 Vidée / ✅ Posée / ⏭️ Passer à chaque arrêt, progression, et
  « Ouvrir les 4 prochains arrêts dans Google Maps » pour la navigation. La tournée en cours est
  gardée sur le téléphone même si on ferme la page.
- **📍 Localiser automatiquement** (bandeau au-dessus de la liste quand des tirelires n'ont pas de position) :
  pour chaque tirelire sans GPS, le site cherche le commerce par son nom dans sa ville (OpenStreetMap),
  sinon la place à côté de la tirelire citée dans son nom (« collée à… », « en face de… »), sinon dans la
  zone de sa ville. Tu valides la liste avant l'enregistrement. Les positions devinées sont marquées
  « approximatives » (point en pointillés) et comptées dans « À localiser » ; elles deviennent exactes
  dès qu'on replace le point à la main ou avec 📍 *Utiliser ma position*.
- **⚙️ Paramètres** : seuils orange / rouge en mois (par défaut 3 et 5), partagés par tous les membres.
- **🚪** : se déconnecter.
