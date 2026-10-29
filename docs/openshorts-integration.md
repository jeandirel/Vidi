# Vidi × OpenShorts — moteur UGC existant (expérimental)

Source upstream : https://github.com/mutonby/openshorts (cœur MIT, conserver sa licence).
Ne pas inclure son dossier `cloud/` dans un SaaS tiers : il dispose d'une
**licence commerciale distincte**. Le code du moteur OpenShorts n'est pas
recopié dans Vidi ; on utilise l'API de son édition auto-hébergée.

## Parcours branché dans Vidi

Vidi conserve ses clients, espaces, projets, validations, crédits et fichiers privés.
Quand `media.kind=avatar` et que le moteur OpenShorts est configuré, le worker :

1. Convertit le script Vidi en contrat OpenShorts à cinq scènes.
2. Réserve de manière persistante un emplacement de tâche externe
   (`Render.providerJobId` = `SUBMITTING`), puis appelle
   `POST /api/saasshorts/generate`.
3. Enregistre le `job_id`, interroge `GET /api/saasshorts/status/{job_id}`.
4. Télécharge uniquement `/videos/saas_{job_id}/...` sur le même hôte,
   vérifie la taille et la signature MP4 puis copie dans le bucket privé Vidi.
5. Finalise le rendu par le registre habituel et permet le téléchargement Vidi.

## Configuration (secrets serveur, jamais NEXT_PUBLIC_)

```dotenv
OPENSHORTS_API_URL=https://openshorts-interne.example.com
OPENSHORTS_SERVICE_TOKEN=jeton-du-reverse-proxy
OPENSHORTS_FAL_KEY=
OPENSHORTS_ELEVENLABS_KEY=
OPENSHORTS_VOICE_ID=
```

Les mêmes paramètres doivent être connus du serveur Next.js (contrôles avant
débit) et du worker. Configurer aussi `DATABASE_URL`, `REDIS_URL`, `S3_BUCKET`,
`S3_REGION` (ou `AWS_REGION`) et l'accès S3 privé. Appliquer la migration
Prisma avant le démarrage du worker.

Installer et lancer OpenShorts depuis le dépôt officiel sur un hôte séparé,
en **désactivant `BILLING_ENABLED`**. Ne jamais exposer son API BYOK directement
sur Internet : l'édition auto-hébergée accepte les en-têtes
`X-Fal-Key` / `X-ElevenLabs-Key` sans authentification client intégrée.
Publier l'API derrière un reverse proxy HTTPS privé qui exige le bearer
`OPENSHORTS_SERVICE_TOKEN` sur **toutes** les routes, y compris les médias.
Limiter les entrées réseau à Vidi, désactiver l'accès public, surveiller les
dépenses fal.ai/ElevenLabs et installer un volume persistant OpenShorts.

## Périmètre et limites

- V1 : **avatar**, **30 secondes**, **9:16**, `720p` ou `1080p`, voix
  standard ; aucune promesse de clonage vocal ni de fidélité produit parfaite.
- La génération d'OpenShorts est fondée sur son propre modèle d'avatar. Les
  noms de casting Vidi restent des directions de création, pas des identités.
- OpenShorts produit une narration et un MP4 réels via fal.ai + ElevenLabs ;
  ses modèles peuvent générer des accessoires ou visuels différents du produit
  original. Un contrôle humain des allégations, des droits et de la fidélité
  du produit est obligatoire avant diffusion.
- Les coûts modèles/serveur restent payants et distincts des crédits Vidi.
- Le serveur OpenShorts conserve l'état des tâches en mémoire. Son redémarrage
  peut rendre le suivi impossible : ne pas le traiter comme un service haute
  disponibilité sans lui ajouter un stockage d'état.
- Si le worker meurt entre l'envoi et l'enregistrement de l'ID externe, l'état
  `SUBMITTING` bloque volontairement une seconde soumission payante. Un
  opérateur doit réconcilier la tâche côté OpenShorts et mettre à jour
  `providerJobId`; la génération n'est PAS automatiquement relancée.
- Pas de garantie « zéro double facturation » en cas de panne distribuée ;
  vérifier les journaux et factures fournisseur avant de libérer un blocage.
- Aucun test API réel ni déploiement d'OpenShorts n'a été effectué par cette
  branche. Exécuter le scénario complet avec clés de test avant publication.

## Test recommandé

`npm test -- --runInBand` puis `npm run typecheck`.
Créer un projet avatar vertical 30 s avec script court, demander une génération,
observer `providerJobId`, attendre le MP4 dans le bucket privé et vérifier
le téléchargement authentifié. Répéter une lecture d'état après interruption
du worker pour vérifier qu'une tâche déjà soumise n'est pas recréée.
