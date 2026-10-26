# Guide de Configuration des Variables d'Environnement Vercel — VIDI

Ce guide détaille l'ensemble des variables d'environnement nécessaires pour déployer et exploiter **VIDI** sur **Vercel** et ses services associés (Worker BullMQ, Moteur Média Python/FFmpeg).

---

## 1. Vue d'Ensemble par Environnement

| Variable | Obligatoire / Optionnel | Environnements Vercel | Fournisseur / Source | Rôle & Impact si absent |
| :--- | :--- | :--- | :--- | :--- |
| `APP_URL` | **Obligatoire** | Prod, Preview, Dev | Domaine Vidi / Vercel | URL de base pour les redirections Stripe et callbacks OAuth. |
| `NEXT_PUBLIC_APP_URL` | **Obligatoire** | Prod, Preview, Dev | Domaine Vidi / Vercel | URL publique pour sitemap, robots.txt et métadonnées SEO. |
| `DATABASE_URL` | **Obligatoire** (Cloud) | Prod, Preview, Dev | Neon / Supabase Postgres | Comptes utilisateurs, workspaces, projets cloud, crédits. Sans base, l'app fonctionne en mode local-draft uniquement. |
| `REDIS_URL` | **Obligatoire** (Queue) | Prod, Preview, Dev | Upstash Redis / Redis Cloud | File de rendu BullMQ et limitation de débit (rate limiting) partagée. |
| `VIDI_INTEGRATION_KEY` | **Obligatoire** | Prod, Preview, Dev | Généré (crypto randomBytes) | Clé de chiffrement AES-256-GCM pour protéger les jetons des boutiques (Shopify, etc.). |
| `LLM_PROVIDER` | Recommandé (`vercel`) | Prod, Preview, Dev | Vercel AI Gateway | Moteur de génération de scripts publicitaires. |
| `AI_GATEWAY_MODEL` | Recommandé | Prod, Preview, Dev | Nvidia / Mistral / OpenAI | Modèle de langage utilisé pour le copywriting UGC. |
| `LLM_FREE_ONLY` | Recommandé (`true`) | Prod, Preview, Dev | Vidi Config | Empêche tout dépassement de frais d'inférence non sollicité. |
| `LLM_GUEST_ENABLED` | Recommandé (`true`) | Prod, Preview, Dev | Vidi Config | Active l'essai gratuit de génération de script sur la landing page. |
| `AI_GATEWAY_API_KEY` | Conditionnel | Prod, Preview, Dev | Vercel OIDC ou clé API | Requis si l'accès à la passerelle n'utilise pas l'identité OIDC Vercel. |
| `S3_BUCKET` | Recommandé | Prod, Preview, Dev | Cloudflare R2 / AWS S3 | Stockage privé des médias et des vidéos générées. |
| `S3_ENDPOINT` | Recommandé | Prod, Preview, Dev | Cloudflare R2 | Point de terminaison S3-compatible (sans frais de sortie sur R2). |
| `AWS_ACCESS_KEY_ID` | Conditionnel (si S3) | Prod, Preview, Dev | R2 API Tokens / IAM AWS | Identifiant d'accès au bucket. |
| `AWS_SECRET_ACCESS_KEY` | Conditionnel (si S3) | Prod, Preview, Dev | R2 API Tokens / IAM AWS | Clé secrète d'accès au bucket. |
| `MEDIA_GATEWAY_URL` | Recommandé (Worker) | Prod, Preview, Dev | VPS Vidi Media | URL du conteneur FastAPI / FFmpeg exécutant le rendu vidéo lourd. |
| `MEDIA_GATEWAY_TOKEN` | Recommandé (Worker) | Prod, Preview, Dev | Secret partagé | Jeton Bearer sécurisant la communication avec le moteur média. |
| `MEDIA_TRANSFER_HOSTS` | Recommandé | Prod, Preview, Dev | Vidi Media Host | Domaines autorisés pour le rapatriement des assets média. |
| `STRIPE_SECRET_KEY` | Optionnel (Facturation) | Prod, Preview, Dev | Dashboard Stripe | Activation du checkout et des abonnements Starter / Pro / Agency. |
| `STRIPE_WEBHOOK_SECRET` | Optionnel (Facturation) | Prod, Preview, Dev | Dashboard Stripe | Vérification de signature cryptographique des webhooks Stripe. |
| `STRIPE_PRICE_STARTER` | Optionnel (Facturation) | Prod, Preview, Dev | Dashboard Stripe | ID du tarif Starter (ex: `price_1...` pour 99€/mois). |
| `STRIPE_PRICE_PRO` | Optionnel (Facturation) | Prod, Preview, Dev | Dashboard Stripe | ID du tarif Pro (ex: `price_1...` pour 299€/mois). |
| `STRIPE_PRICE_AGENCY` | Optionnel (Facturation) | Prod, Preview, Dev | Dashboard Stripe | ID du tarif Agency (ex: `price_1...` pour 999€/mois). |
| `RESEND_API_KEY` | Optionnel (Emails) | Prod | Resend (resend.com) | Envoi d'alertes par email lors des soumissions du formulaire `/contact`. |

---

## 2. Procédure Pas-à-Pas pour Vercel

### Étape 1 : Base de Données PostgreSQL (Neon Serverless)
1. Créez un projet sur [Neon.tech](https://neon.tech) nommé `vidi-production`.
2. Copiez la chaîne de connexion avec pooler activé.
3. Définissez la variable dans Vercel :
   ```bash
   DATABASE_URL="postgresql://vidi_user:secret@ep-cool-pooler.eu-central-1.aws.neon.tech/vidi?sslmode=require&schema=public"
   ```
4. Exécutez les migrations Prisma lors du premier déploiement ou via le terminal :
   ```bash
   npm run db:deploy
   ```

### Étape 2 : Queue Redis (Upstash)
1. Créez une base de données Redis sur [Upstash.com](https://upstash.com) en région proche (ex: Frankfurt).
2. Copiez l'URL Redis sécurisée (`rediss://...`).
3. Définissez la variable dans Vercel :
   ```bash
   REDIS_URL="rediss://default:token@eu1-sweet-cat.upstash.io:6379"
   ```

### Étape 3 : Clé de Chiffrement d'Intégration
Générez une clé cryptographique aléatoire de 64 caractères hexadécimaux :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Ajoutez-la sur Vercel sous le nom `VIDI_INTEGRATION_KEY`.

### Étape 4 : Stockage Objet Cloudflare R2
1. Dans Cloudflare Dashboard > R2, créez un bucket `vidi-media-production`.
2. Créez un API Token R2 avec droits de lecture et écriture.
3. Renseignez :
   - `S3_BUCKET` = `vidi-media-production`
   - `S3_REGION` = `auto`
   - `S3_ENDPOINT` = `https://<votre-compte-id>.r2.cloudflarestorage.com`
   - `AWS_ACCESS_KEY_ID` = `<token-access-key>`
   - `AWS_SECRET_ACCESS_KEY` = `<token-secret-key>`

### Étape 5 : Moteur Média & Worker Rendu (Hébergement Dédié)
> [!IMPORTANT]
> Un worker BullMQ persistant et le moteur de rendu vidéo FFmpeg ne doivent **PAS** être hébergés comme de simples fonctions Vercel Serverless (durée maximale de fonction 60s sur plan Hobby / 300s sur Pro).
> Le moteur média tourne dans le conteneur `vidi-media` sur le VPS.
> Renseignez sur Vercel :
> - `MEDIA_GATEWAY_URL` = `https://media.vidi.ai`
> - `MEDIA_GATEWAY_TOKEN` = `votre_secret_interne_complexe`
> - `MEDIA_TRANSFER_HOSTS` = `media.vidi.ai`

---

## 3. Messages d'Erreur Explicites

L'application a été conçue pour échouer de manière explicite et informative :

- **Absence de `DATABASE_URL`** : L'interface informe l'utilisateur que le mode local-draft est actif sur cet appareil et que la synchronisation cloud sera disponible dès la configuration de la base.
- **Absence de passerelle vidéo** : Le bouton de rendu informe que le moteur média est en attente d'activation serveur, sans jamais prétendre faussement qu'une vidéo a été générée.
- **Absence de Stripe** : Les pages de checkout restent désactivées de manière élégante et indiquent le mode démonstration.
- **Absence de passerelle LLM** : L'essai interactif bascule automatiquement sur un générateur heuristique calibré AIDA/PAS sans blocage de l'interface utilisateur.

---

## 7. Configuration de l'Authentification Google OAuth 2.0 (Google Sign-In)

1. Rendez-vous sur la [Google Cloud Console](https://console.cloud.google.com/).
2. Créez ou sélectionnez votre projet Google Cloud.
3. Accédez à **APIs & Services > OAuth consent screen (Écran de consentement OAuth)** :
   - Choisissez le type **Externe**.
   - Renseignez le nom de l'application : `Vidi`.
   - Email de contact développeur et support utilisateur.
   - Ajoutez les champs obligatoires dans les scopes : `openid`, `email`, `profile`.
4. Accédez à **APIs & Services > Credentials (Identifiants)** :
   - Cliquez sur **Create Credentials > OAuth client ID (ID client OAuth)**.
   - Type d'application : **Web application (Application Web)**.
   - Nom : `Vidi Web Client`.
   - **Authorized JavaScript origins (Origines JavaScript autorisées)** :
     - `http://localhost:3000` (développement local)
     - `https://votre-projet.vercel.app` (production)
   - **Authorized redirect URIs (URI de redirection autorisées)** :
     - `http://localhost:3000/api/auth/google/callback`
     - `https://votre-projet.vercel.app/api/auth/google/callback`
5. Récupérez le **Client ID** et le **Client Secret**.
6. Dans Vercel (ou dans votre `.env` local) :
   ```env
   GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
   GOOGLE_REDIRECT_URI=https://votre-projet.vercel.app/api/auth/google/callback
   ```
7. Redéployez : Le bouton « Continuer avec Google » authentifiera directement les utilisateurs avec création automatique de session et de leur espace workspace dans PostgreSQL.

