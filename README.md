# Tirelires Rengo 🏛️

Mini-site pour les membres de l'association : voir les tirelires sur une carte,
depuis quand elles sont posées, quand elles ont été vidées, et en ajouter.
Accès protégé par un code unique.

- **Site** : `index.html` (une seule page, carte Leaflet/OpenStreetMap)
- **API** : `api/tirelires.js` (fonction serverless Vercel, vérifie le code d'accès)
- **Base de données** : Supabase (Postgres gratuit), table créée par `supabase.sql`

Code couleur (comme dans Notion) : 🟢 vidée il y a < 6 semaines · 🟠 6 à 9 semaines · 🔴 > 9 semaines
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

### 3. (Optionnel) Reprendre les tirelires existantes de Notion
1. Dans Notion, base **🏛️ Tirelires Rengo** → `⋯` → **Export** → CSV.
2. Adapte les colonnes au format `entreprise, ville, adresse, lat, lng, date_pose, dernier_vidage, notes`
   (les coordonnées GPS peuvent se retrouver en cherchant l'adresse sur https://www.openstreetmap.org).
3. Dans Supabase → **Table Editor → tirelires → Insert → Import data from CSV**.

## Utilisation
- **Carte** : chaque point = une tirelire, couleur = urgence du vidage. Clic = détails.
- **➕ Ajouter** : nom du commerce, ville, adresse, date de pose, puis la position
  (clic sur la carte, 📍 *Ma position* sur place, ou 🔎 *Depuis l'adresse*).
- **💧 Vidée** : met la date du dernier vidage à aujourd'hui.
- Corriger / supprimer une tirelire : directement dans Supabase → *Table Editor*.
