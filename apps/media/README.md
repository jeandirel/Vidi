# Vidi media gateway

Service privé FastAPI + FFmpeg, indépendant de Vercel. Le worker Node lui soumet une tâche persistée puis interroge son état ; les médias arrivent directement dans le stockage privé via des URL signées. Aucun service vidéo ou vocal payant n’est appelé.

## Ce qui est implémenté

- `POST /jobs`, `GET /jobs/{id}` et `GET /health`, tous protégés par un bearer opérateur d’au moins 32 caractères.
- Identifiant durable, contrôle du contenu des réessais, file bornée à cinq opérations, une inférence à la fois, SQLite et reprise après redémarrage. Une erreur terminale ne relance pas silencieusement l’inférence.
- Vidéo verticale MP4/H.264 de 15/30/60 secondes, photo produit et sous-titres, en 720p/1080p/4K. La photo publique est téléchargée par le worker avec contrôle DNS/IP et limite de taille, puis transmise en données d’image.
- TTS et clonage zero-shot multilingue avec Chatterbox, quand ses dépendances et modèles sont installés. Les échantillons de référence doivent faire 5 à 30 secondes et moins de 10 Mo.
- Adaptateur d’inférence MuseTalk 1.5 pour une bibliothèque de vidéos d’acteurs autorisés. Chaque identifiant doit correspondre à un fichier installé ; les portraits illustratifs de l’interface ne sont pas utilisés.
- Transferts HTTPS uniquement vers des hôtes de stockage explicitement autorisés, sans redirections. Nettoyage du répertoire temporaire après chaque tâche ; suppression du payload SQLite contenant les URL signées une fois la tâche terminée.

## Démarrage CPU pour la vidéo produit

Depuis la racine du dépôt, renseigner dans un fichier `.env` privé :

- `MEDIA_GATEWAY_TOKEN` : secret aléatoire long, partagé uniquement avec le worker et l’application serveur.
- `MEDIA_TRANSFER_HOSTS` : hostname exact du endpoint S3/Neon/R2 utilisé, sans protocole ni chemin. Pas de wildcard.
- `MEDIA_INSTALL_TTS=false`, `MEDIA_ENABLE_TTS=false`.

```sh
docker compose -f compose.yaml -f compose.media.yaml --profile media up --build media
```

Le service écoute sur `127.0.0.1:8000`. Installer un reverse proxy HTTPS sur une machine que l’on contrôle, avec stockage durable pour `/data`. Le worker refuse une URL de gateway HTTP. Une seule instance/processus dessert le volume SQLite ; ce service ne prétend pas être un orchestrateur multi-réplicas.

Dans le worker Node et Vercel, configurer `MEDIA_GATEWAY_URL` (base HTTPS), `MEDIA_GATEWAY_TOKEN`, `REDIS_URL` et les variables S3 de la branche concernée. Le worker a aussi besoin de `DATABASE_URL`. Il doit tourner en continu ; il ne s’exécute pas dans le navigateur ou pendant un build Next.js.

`GET /health` est authentifié. Il indique les moteurs réellement chargés et les identifiants de voix/acteurs installés. Vidi vérifie cet état avant de réserver les crédits d’un rendu natif. Les liens des résultats sont signés à la demande après contrôle du workspace.

## Activer les voix et les avatars sur sa machine

1. Construire le service avec `MEDIA_INSTALL_TTS=true`. Cela installe `chatterbox-tts==0.1.7` et ses dépendances ; le téléchargement est important. L’installation des poids et les versions transitives amont doivent être conservées dans l’image de déploiement retenue.
2. Choisir `MEDIA_DEVICE=cpu` pour un essai compatible ou `cuda` avec une carte NVIDIA et NVIDIA Container Toolkit. Pour ce dernier cas, ajouter `-f compose.gpu.yaml` à la commande Docker. Les temps et la mémoire nécessaires doivent être mesurés sur la machine cible.
3. Activer `MEDIA_ENABLE_TTS=true`. Le modèle est chargé au démarrage ; le serveur ne devient pas disponible si ce chargement échoue.
4. Pour les voix standard, installer les fichiers autorisés `models/voices/claire.wav`, `noah.wav`, `amina.wav`, `james.wav`. Pour le clonage utilisateur, le worker fournit l’extrait privé du profil avec sa déclaration de droits.
5. Pour les avatars, installer MuseTalk et ses poids officiels dans `models/musetalk`, avec un environnement Python séparé à `.venv/bin/python`. Les dépendances MuseTalk et Chatterbox n’utilisent pas nécessairement les mêmes versions de Torch ; ne pas les fusionner arbitrairement. L’environnement MuseTalk doit être Linux et utilisable à l’intérieur du conteneur.
6. Placer les vidéos d’acteurs autorisés dans `models/actors/lea.mp4`, `marcus.mp4`, `maya.mp4`, `alex.mp4`, `ines.mp4`, `kenji.mp4`. Seuls les identifiants présents sont annoncés. Utiliser les instructions amont pour les prérequis, poids annexes et licences ; les exemples de recherche ne constituent pas un catalogue d’acteurs commerciaux.

La synthèse d’avatar synchronise les lèvres d’une vidéo source. Elle ne génère pas une nouvelle gestuelle ni des mains tenant fidèlement un produit. Les sous-titres utilisent un pacing planifié ; l’alignement mot à mot, les styles animés avancés, les B-rolls, les transitions et la musique multi-pistes ne sont pas encore rendus par ce moteur. Un audio plus long que la durée choisie est refusé, sans couper la fin de la phrase.

## Vérification et limites observées

- Test réel effectué avec FFmpeg : MP4 720×1280, 15 secondes, H.264 et sous-titres.
- Sept tests Python couvrent aussi authentification, idempotence, limites, transferts et texte des sous-titres.
- Chatterbox et MuseTalk n’ont pas été exécutés avec leurs modèles dans l’environnement de développement : aucun GPU ou poids n’y est installé. L’adaptateur doit être validé sur la machine cible avant commercialisation.
- Docker n’est pas disponible dans cet environnement ; le Dockerfile n’y a pas été construit. Les dépendances légères et le service Python ont été testés directement.
- Limite du worker : 30 minutes par tentative. Les URL de transfert expirent après une heure ; une file trop lente ou une interruption prolongée peut faire échouer une tâche, puis déclencher le remboursement idempotent des crédits vidéo.
- Les objets générés avant un échec de transaction ou une révocation peuvent nécessiter un nettoyage opérateur ; aucun lien n’est délivré tant qu’ils ne sont pas confirmés en base.

Sources : [Chatterbox](https://github.com/resemble-ai/chatterbox), [MuseTalk et installation](https://github.com/TMElyralab/MuseTalk). Les licences des dépendances, poids et médias doivent être respectées.
