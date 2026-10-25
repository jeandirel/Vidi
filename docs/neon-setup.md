# Raccorder Vidi à Neon

Le compte Neon connecté appartient à une organisation gérée par Vercel. La création d’un projet depuis l’API Neon est refusée pour cette organisation ; créer la ressource dans Vercel, projet **Vidi → Storage → Create Database → Neon**, avec l’offre **Free**. Ne pas changer le plan de l’organisation. La ressource `bold-smoke-96008102` a été créée par le propriétaire dans Vercel. La branche principale est `br-hidden-tree-b77z44h9` ; la branche de validation est `br-royal-art-b7jr3bd5` (`vidi-preview`). Les connexions Vercel Preview et Production sont séparées.

## Configuration

- Conserver les comptes et sessions Prisma existants. Neon Auth n’est pas nécessaire pour cette application.
- Placer la base près des fonctions Vercel (AWS us-east-1 pour iad1).
- Utiliser une branche Neon de validation distincte de la production. La préversion Vercel doit pointer vers cette branche, jamais vers la base de production.
- Définir `DATABASE_URL` comme secret serveur dans les environnements Vercel concernés, avec la connexion **pooled**. Ne pas exposer la chaîne dans le navigateur ou dans Git.
- Pour les migrations Prisma, injecter la connexion **directe** comme `DATABASE_URL` dans le processus de migration, puis lancer `npm run db:migrate`. Ne pas utiliser le pooler pour les migrations. Tester d’abord sur la branche de validation, puis appliquer les migrations versionnées à la production avant promotion du code.
- Vérifier l’inscription, la reconnexion, la création et la réouverture d’un projet, puis l’isolation entre deux espaces.

## Redis

Redis est optionnel pour les comptes, les projets et les quotas des scripts/imports/API. Sans `REDIS_URL`, les quotas utilisent `RateLimitBucket` dans PostgreSQL : compteur atomique partagé entre instances, expiration et nettoyage borné des anciens compteurs. Appliquer la migration `202610250002_shared_quotas` avant activation de la base.

Redis reste nécessaire pour BullMQ et les workers de rendu vidéo. Un Redis configuré mais indisponible provoque un refus des opérations soumises à quota ; le serveur ne change pas de stockage en cours de période.

## Coûts et disponibilité

L’organisation connectée indique une offre Free. Les limites applicables doivent être contrôlées dans Vercel/Neon avant ouverture publique. Aucun passage à une offre payante n’est automatique dans ce code. La génération de scripts utilise le modèle gratuit déjà connecté à Vercel AI Gateway ; elle ne dépend pas de la création de cette base.

## Migration depuis Vercel

`VIDI_DB_SETUP=true` active l’exécution de `prisma migrate deploy` avant le build, avec `DATABASE_URL_UNPOOLED` (connexion directe). Les sorties ne révèlent pas la chaîne de connexion. Sans ce drapeau, aucun schéma n’est modifié pendant le build.

`VIDI_CLOUD_SMOKE=true` lance un contrôle opt-in du serveur Next compilé sur localhost dans le build : inscription d’un compte jetable, session, sauvegarde/réouverture/recherche d’un projet, déconnexion et reconnexion. Seuls le résultat des contrôles et les erreurs sans secrets sont affichés. Le compte de test et son espace sont supprimés après vérification ; aucun rendu vidéo ni appel LLM n’est déclenché. Désactiver ce contrôle après validation.
