# Activation des services Vidi

Cette livraison ajoute les parcours d’activation, les connecteurs et un moteur média auto-hébergeable. « Configuré » dépend des connexions réellement enregistrées ou du moteur annoncé par le serveur ; aucune clé, boutique, souscription ou machine n’est inventée.

## Shopify / WooCommerce

Dans **Mon espace → Boutiques & tendances → Connexions**, le propriétaire choisit le service et l’adresse racine HTTPS de sa boutique. Vidi teste l’API avant d’enregistrer la connexion, séparément pour chaque workspace.

- Shopify utilise l’API **Storefront 2026-10 sans jeton**, pour les produits publiés et les prix. La boutique doit permettre cet accès. Ce n’est pas une connexion Admin OAuth et cela n’ouvre pas les commandes, clients, stocks privés ou avis d’applications tierces.
- WooCommerce utilise **Store API v1**, pour les produits publics, prix et avis disponibles. Les noms et emails des auteurs d’avis ne sont pas retournés dans la réponse Vidi.
- **Catalogue** permet de rechercher, parcourir vingt produits par page, consulter une fiche, puis confirmer son utilisation. L’import crée une nouvelle préparation locale ; le projet cloud précédent n’est pas écrasé. Le prix et sa date sont conservés avec la provenance du produit et disponibles au LLM.
- HTTPS/443, DNS public vérifié et épinglé à la connexion TLS, aucune redirection pour les requêtes JSON, limite de 1 Mo/12 secondes. Pas de cookies ni identifiants marchand transmis à une boutique.
- Aucun catalogue réel du propriétaire n’a été synchronisé pendant le développement : son domaine n’a pas été fourni. Les connecteurs ont des tests de contrats et de parcours avec réponses simulées explicitement identifiées.

## Tendances sociales

Le connecteur livré est **YouTube Data API**, pas un flux TikTok/Instagram ni une détection de publicités UGC gagnantes. Le classement `mostPopular` officiel porte sur les vidéos populaires musique/cinéma/gaming de la région choisie. Il ne prédit pas la performance d’un produit.

Le propriétaire ajoute une clé Google Cloud limitée à YouTube Data API et choisit une région à deux lettres. Vidi vérifie une première requête avant l’enregistrement. La clé est chiffrée en AES-256-GCM, liée au workspace et au fournisseur, et n’est jamais retournée par l’API. `VIDI_INTEGRATION_KEY` doit être un secret hexadécimal de 32 octets, stable dans un environnement, différent entre production et preview. Ne pas le remplacer sans migration des secrets existants.

La liste donne titre, chaîne, publication, vues disponibles et date de récupération. L’utilisateur peut conserver jusqu’à huit références dans son projet et annoter son intention dans le Laboratoire. Le LLM reçoit titre/note comme inspiration, sans analyse prétendue de la vidéo, et ne doit pas copier le texte ni en déduire des bénéfices produit. Les quotas Vidi bornent les appels ; les quotas de la clé restent ceux du projet Google.

Aucune clé YouTube réelle n’a été fournie ou utilisée dans les tests. La découverte TikTok/Meta et un serveur MCP autonome restent des travaux séparés.

## Vidéo et clonage vocal

Voir [le moteur média](../apps/media/README.md) et [le contrat historique](video-gateway.md).

- Dans **Montage**, choisir vidéo produit ou avatar, puis sans narration, voix standard ou voix autorisée. Le serveur vérifie ses moteurs/ressources avant la réservation de crédits.
- La vidéo produit FFmpeg est implémentée et a produit un vrai MP4 en test. Sa mise à disposition cloud exige encore un serveur et un worker actifs, Redis et les accès S3 de production.
- Le TTS/clonage est relié à Chatterbox et l’avatar à MuseTalk. Leurs inférences ne sont pas validées ici sans leurs modèles et matériel. Aucune promesse de qualité ou de vitesse n’est déduite du seul adaptateur.
- Dans **Mon espace → Voix personnalisées**, choisir un MP3/WAV confirmé de la bibliothèque, nommer la voix et déclarer explicitement ses droits. La version de déclaration, le compte et la date sont conservés côté serveur. Il s’agit d’une déclaration, pas d’une vérification automatique d’identité ou de titularité.
- Le profil peut être révoqué. L’accès à la référence et la validité de l’autorisation sont contrôlés à nouveau avant la livraison du résultat, avec verrou transactionnel. Les sorties déjà livrées ne sont pas effacées rétroactivement par cette révocation.
- Les synthèses séparées sont accessibles aux offres Pro/Agency, limitées à dix/jour/espace, avec clé d’idempotence et suivi. Elles n’utilisent pas de crédits vidéo ; ce modèle doit être réévalué selon le coût de la machine exploitée.
- Les résultats sont privés et téléchargeables par une URL signée après contrôle du workspace ; les URL signées et secrets ne figurent pas dans les logs applicatifs.

## Abonnements Stripe

Checkout, portail, webhook signé et attribution des crédits idempotente sont déjà implémentés. Le compte Stripe et ses variables réelles ne sont pas encore configurés.

`scripts/setup-billing.mjs` prépare les tarifs 99/299/999 EUR par mois, un portail dédié et les événements webhook requis, à partir d’une clé fournie par l’opérateur via l’environnement. Il ne crée aucune souscription ni paiement. Il exige le mode test par défaut. Le mode réel exige un choix explicite du compte et `STRIPE_SETUP_ALLOW_LIVE=true`.

```sh
node --env-file=.env.billing-input scripts/setup-billing.mjs
```

Le fichier d’entrée privé doit définir `STRIPE_SECRET_KEY` et `APP_URL` HTTPS. Utiliser de préférence une clé restreinte avec les permissions nécessaires aux ressources de configuration. Le script vérifie l’accès public de `/api/billing/webhook` en GET (405 attendu), refuse de dupliquer un webhook existant, et écrit un `.env.billing` privé à permissions 0600 sans afficher ses valeurs. Il ne l’écrase pas ; un échec partiel doit être examiné avant reprise.

Transférer ses variables dans Vercel de manière sécurisée, y compris `STRIPE_PORTAL_CONFIGURATION`, puis redéployer. Les environnements de test et de production doivent utiliser des secrets et événements cohérents. Un paiement de test et les notifications Stripe réelles restent à vérifier avant ouverture commerciale. Aucun script de provisioning Stripe n’a été exécuté avec une clé ou un compte réel pendant cette livraison.

## Validation

La migration `202610250003_service_connections` ajoute les connexions par workspace, les profils/consentements et les tâches vocales, ainsi qu’un identifiant d’asset pour les rendus privés. La CI utilise PostgreSQL et Redis pour vérifier droits, isolation, révocation et non-exposition des secrets. Une preview Neon doit appliquer et vérifier cette migration avant fusion en production.

Les indicateurs ne remplacent pas un test bout en bout avec la boutique, les clés et la machine réellement exploitées. Les limites ci-dessus sont maintenues visibles dans les parcours et documentations.

Sources : [Shopify Storefront](https://shopify.dev/docs/api/storefront/latest), [WooCommerce Store API](https://developer.woocommerce.com/docs/apis/store-api/), [YouTube videos.list](https://developers.google.com/youtube/data/reference/rest/v3/videos/list), [prix Stripe](https://docs.stripe.com/api/prices/create), [webhooks Stripe](https://docs.stripe.com/api/webhook_endpoints/create).
