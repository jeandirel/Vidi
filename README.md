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

Créer un compte depuis « Mon espace ». Les mots de passe sont dérivés avec scrypt ; les sessions utilisent des cookies HttpOnly et des jetons hachés en base. Les comptes commencent avec **0 crédit** : aucun paiement ou crédit gratuit n’est simulé. En développement uniquement, un opérateur peut allouer un solde via Prisma Studio (`npx prisma studio --schema packages/db/prisma/schema.prisma`). Le crédit d’un compte de production devra passer par un registre de transactions et les webhooks du prestataire de paiement.

- Scripts IA : configurer `OPENAI_API_KEY` et `OPENAI_MODEL` côté serveur. Aucun secret dans le navigateur.
- Vidéos : connecter un gateway respectant [le contrat vidéo](docs/video-gateway.md), puis lancer `npm run worker` dans un autre terminal. **Aucun fournisseur avatar/TTS natif n’est intégré à ce stade.**
- Uploads : endpoint S3/R2 présigné ; configurer le bucket privé, les identifiants IAM et la politique CORS. L’interface utilise actuellement une image locale (1 Mo max).
- Webhook sortant : `WEBHOOK_URL` et `WEBHOOK_SECRET`, configurés uniquement par l’opérateur. Ce webhook est global à l’instance, destiné à son backend de confiance ; il ne s’agit pas encore d’un abonnement webhook par client.

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

Les tests d’intégration s’activent avec `INTEGRATION_TESTS=1` et les services du workflow CI. Ils utilisent deux vrais comptes, vérifient l’isolation des projets et les crédits sous requêtes concurrentes. Ils n’appellent aucun service IA payant. Ne pas les lancer sur une base de production.

## Déploiement

**Vercel :** importer ce dépôt, choisir `apps/web` comme Root Directory, activer l’accès aux fichiers hors de ce répertoire. Install Command : `cd ../.. && npm ci && npm run db:generate`. Build Command : `cd ../.. && npm run build`. Définir les variables serveur séparément pour Preview et Production ; migrer PostgreSQL avant promotion. Aucune intégration Vercel ni ressource cloud n’est créée automatiquement par ce commit.

**Workers :** `docker build -f apps/worker/Dockerfile -t vidi-worker .`, puis injecter les variables par le gestionnaire de secrets de l’hébergeur. Les workers doivent être des services persistants, pas des fonctions HTTP éphémères. Le redimensionnement ECS/Cloud Run et les alertes doivent être configurés sur l’infrastructure cible ; ils ne sont pas provisionnés ici.

Consulter [le périmètre livré et le reste à faire](docs/specification-status.md). La base est destinée au développement ; abonnements, génération native, e-commerce, MCP, administration et validation client doivent être terminés avant ouverture commerciale.

## Visuels

Portraits photographiques de prévisualisation provenant d’Unsplash, référencés dans [les crédits visuels](docs/assets.md). Les noms des profils sont des étiquettes de casting fictives. Ces portraits ne sont pas des personnes clonées ni des avatars animables fournis par une API.
