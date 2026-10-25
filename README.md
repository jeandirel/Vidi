# Vidi

Studio SaaS de création de vidéos publicitaires UGC. Monorepo Next.js / TypeScript, PostgreSQL / Prisma et workers BullMQ.

## Démarrer le studio

Node.js 22.12+ et npm 10+.

```sh
npm ci
npm run db:generate
npm run dev
```

Ouvrir http://localhost:3000. Sans configuration, le studio fonctionne en **brouillons locaux** : produit, image, script éditable, casting, voix, timeline, sauvegarde, réouverture et variantes. Le bouton « Composer » utilise uniquement les informations fournies, sans appel LLM ni traduction automatique. L’aperçu de composition n’est pas une vidéo générée.

## Activer les services cloud

```sh
cp .env.example .env
docker compose up -d
npm run db:migrate
npm run dev
```

Le serveur web charge le `.env` de la racine du monorepo via la configuration Next.js. Les workers le chargent explicitement.

Créer un compte depuis « Mon espace ». Les mots de passe sont dérivés avec scrypt ; les sessions utilisent des cookies HttpOnly et des jetons hachés en base. Les comptes commencent avec **0 crédit** : aucun paiement ou crédit gratuit n’est simulé. En développement uniquement, un opérateur peut allouer un solde via Prisma Studio (`npx prisma studio --schema packages/db/prisma/schema.prisma`). Le crédit d’un compte de production passe par le registre de transactions et les factures Stripe vérifiées par webhook.

- Scripts IA : `LLM_PROVIDER=vercel`, `AI_GATEWAY_MODEL=nvidia/nemotron-3.5-lightning-free`, `LLM_FREE_ONLY=true`. Sur Vercel, activer OIDC ; hors Vercel, fournir `AI_GATEWAY_API_KEY` côté serveur. Le catalogue est vérifié avant chaque appel : prix entrée/sortie strictement nuls, aucun repli payant. Le fournisseur peut imposer quotas ou vérification de compte. Le consentement au traitement du texte produit est demandé avant envoi ; ce modèle gratuit peut conserver les données. `LLM_GUEST_ENABLED=true` autorise un essai sans compte. Les quotas sont partagés via Redis, ou via des compteurs PostgreSQL atomiques quand Redis est absent. Sans les deux, les quotas invités restent locaux à chaque instance ; ce dernier mode convient seulement aux essais privés.
- Vidéos : connecter un gateway respectant [le contrat vidéo](docs/video-gateway.md), puis lancer `npm run worker` dans un autre terminal. **Aucun fournisseur avatar/TTS natif n’est intégré à ce stade.**
- Uploads : bibliothèque privée dans Réglages, upload S3/R2 présigné, vérification de taille/type par HeadObject, téléchargements signés. Configurer bucket privé, IAM et CORS PUT/Content-Type depuis APP_URL. Limite interface 100 Mo/fichier, quota nominal 1 Go/espace. Les uploads abandonnés et les courses concurrentes de quota nécessitent une politique de nettoyage et un contrôle renforcé avant exploitation à grande échelle.
- Webhook sortant : `WEBHOOK_URL` et `WEBHOOK_SECRET`, configurés uniquement par l’opérateur. Ce webhook est global à l’instance, destiné à son backend de confiance ; il ne s’agit pas encore d’un abonnement webhook par client.

Pour Neon géré par Vercel, suivre [le raccordement et les migrations](docs/neon-setup.md). PostgreSQL peut assurer les quotas partagés sans Redis ; Redis reste requis pour les rendus BullMQ.

## Équipes, validations et API

Dans Réglages, un propriétaire gère les membres et invitations (lien à transmettre soi-même, aucune invitation envoyée automatiquement). L’utilisateur doit se connecter avec l’adresse invitée. Un éditeur soumet une version à validation ; le client VIEWER ou le propriétaire l’approuve. Toute modification invalide cette approbation et bloque le rendu jusqu’à une nouvelle validation.

Les clés API Agency sont hachées, expirent sous 90 jours maximum et peuvent être révoquées. Le secret n’est affiché qu’à la création. Utiliser `Authorization: Bearer vi_key_…` et `workspaceId` sur les endpoints projets, rendus et assets. Une clé VIEWER ne peut pas écrire ; la suppression du membre créateur supprime son accès. Les routes de gestion restent réservées aux sessions propriétaires. Limite : 60 requêtes/minute/clé, partagée par Redis ou PostgreSQL.

## Abonnements Stripe

Configurer les trois prix mensuels EUR (99/299/999 €), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, leurs identifiants dans `.env.example` et `APP_URL` HTTPS en production. Créer l’endpoint Stripe `/api/billing/webhook` pour checkout.session.completed, checkout.session.async_payment_succeeded, customer.subscription.updated/deleted, invoice.paid et invoice.payment_failed. Configurer le portail client Stripe. Aucun paiement n’est activé sans l’ensemble des paramètres.

Les factures de création/renouvellement payées accordent 15/60/250 crédits une seule fois par facture. Les proratas n’accordent pas un lot complet. Le retour navigateur ne crédite jamais le compte. Les crédits s’accumulent actuellement ; toute politique d’expiration devra être ajoutée explicitement. Tester d’abord avec des clés et prix Stripe de test.

## Importer une fiche produit

Dans le studio, coller une URL HTTPS puis cliquer sur **Importer la fiche**. Cette opération nécessite un compte cloud ; les quotas utilisent Redis ou PostgreSQL. Vidi lit les métadonnées JSON-LD Product ou Open Graph ; il n’exécute pas les scripts du site et ne se connecte pas au compte boutique. Les informations sont présentées pour vérification avant application. L’image est optionnelle ; les bénéfices et témoignages ne sont pas déduits ou inventés. Appliquer une nouvelle fiche efface le script précédent pour éviter de l’associer au mauvais produit.

Cette fonction n’est pas encore une synchronisation Shopify/WooCommerce via OAuth. Les pages privées, les pages nécessitant JavaScript, les réponses compressées imposées et les pages de plus de 1 Mo peuvent être refusées. Les connexions sortantes bloquent les IP privées, les IP littérales, les ports non standard et les redirections internes.

## Structure

```text
apps/web/        Studio Next.js + endpoints REST authentifiés
apps/worker/     Rendus asynchrones + notifications signées
packages/core/   Validation des projets, scripts et calcul des crédits
packages/db/     Schéma PostgreSQL, migration initiale et client Prisma
tests/          Jest + Playwright + intégration PostgreSQL/Redis
docs/           Architecture, contrat gateway et suivi du cahier des charges
```

## Vérifications

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Les tests d’intégration s’activent avec `INTEGRATION_TESTS=1` et les services du workflow CI. Ils créent de vrais comptes, vérifient l’isolation, les invitations, les rôles, les clés API, les validations de versions et les crédits sous requêtes concurrentes. Ils n’appellent aucun service IA payant. Ne pas les lancer sur une base de production.

## Déploiement

**Vercel :** importer ce dépôt, choisir `apps/web` comme Root Directory, activer l’accès aux fichiers hors de ce répertoire. Install Command : `cd ../.. && npm ci`. Build Command : `npm run build` (depuis apps/web, génération Prisma incluse). Définir les variables serveur séparément pour Preview et Production ; migrer PostgreSQL avant promotion. Aucune intégration Vercel ni ressource cloud n’est créée automatiquement par ce commit.

**Workers :** `docker build -f apps/worker/Dockerfile -t vidi-worker .`, puis injecter les variables par le gestionnaire de secrets de l’hébergeur. Les workers doivent être des services persistants, pas des fonctions HTTP éphémères. Le redimensionnement ECS/Cloud Run et les alertes doivent être configurés sur l’infrastructure cible ; ils ne sont pas provisionnés ici.

Consulter [le périmètre livré et le reste à faire](docs/specification-status.md). Les services restent conditionnés aux ressources et secrets configurés ; génération vidéo native, e-commerce, MCP et affiliation restent à réaliser avant de présenter le cahier des charges comme complet.

## Visuels

Portraits photographiques de prévisualisation provenant d’Unsplash, référencés dans [les crédits visuels](docs/assets.md). Les noms des profils sont des étiquettes de casting fictives. Ces portraits ne sont pas des personnes clonées ni des avatars animables fournis par une API.

## Laboratoire de campagnes

Le menu **Laboratoire** rassemble brief de marque, arguments sourcés, variantes isolant une accroche ou un CTA, import CSV de résultats avec confirmation, métriques calculées et dossier JSON exportable. Il ne lance aucun rendu vidéo ni publicité. [Guide](docs/campaign-lab.md) · [Analyse de huit acteurs et priorités](docs/ugc-market-benchmark.md).

## Connexions et moteur média

**Mon espace** inclut maintenant les connexions catalogue Shopify/WooCommerce, YouTube Data API et les profils vocaux avec déclaration/révocation des droits. Les clés de tendances sont chiffrées par workspace. Le moteur natif `apps/media` produit réellement des MP4 avec FFmpeg et possède des adaptateurs Chatterbox/MuseTalk ; ces derniers exigent modèles et matériel à valider. Les services externes ne sont pas activés sans leurs accès. [Activation et limites](docs/service-activation.md) · [Serveur média](apps/media/README.md).
