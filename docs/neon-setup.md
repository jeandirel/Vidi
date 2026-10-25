# Raccorder Vidi à Neon

Le compte Neon connecté appartient à une organisation gérée par Vercel. La création d’un projet depuis l’API Neon est refusée pour cette organisation ; créer la ressource dans Vercel, projet **Vidi → Storage → Create Database → Neon**, avec l’offre **Free**. Ne pas changer le plan de l’organisation. Aucune base Vidi n’a été créée automatiquement pendant cette préparation.

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
