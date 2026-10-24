# Cahier des charges — état de l’implémentation

La cible reste l’ensemble du cahier des charges fourni. Cette première livraison est un socle de développement, pas un SaaS commercial complet. Aucun résultat vidéo ou paiement n’est fabriqué pour donner l’impression qu’une intégration fonctionne.

| Exigence                                          | État de cette livraison                                                               | Suite nécessaire                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Studio sombre, responsive, navigation rétractable | Implémenté                                                                            | Validation utilisateur sur appareils réels                                                 |
| Produit et photo                                  | Saisie, dépôt local d’image et lien source                                            | Import URL sécurisé, extraction et validation des faits                                    |
| Scripts hook / message / CTA                      | Éditeur, composition locale, endpoint OpenAI Responses                                | Clé et modèle côté serveur, validation qualitative en conditions réelles                   |
| Avatars photoréalistes                            | Casting illustratif et sélection enregistrée                                          | Fournisseur réel, catalogue autorisé, lip-sync, gestuelle                                  |
| Voix multilingues et émotions                     | Paramètres enregistrés, aperçu voix système                                           | Fournisseur TTS premium et vrais échantillons vocaux                                       |
| Clonage vocal                                     | Non disponible                                                                        | Consentement explicite, preuve de titularité, API de clonage                               |
| Timeline multi-pistes                             | Segments, ordre par glisser-déposer ou clavier, durées et points d’entrée             | Moteur d’édition, import B-rolls/audio, transitions, synchronisation précise et export     |
| Sous-titres dynamiques                            | Paramètre et composition illustrative                                                 | Alignement temporel réel et rendu des styles                                               |
| Projets                                           | Brouillons locaux, variantes ; CRUD cloud avec authentification                       | Suppression cloud, recherche serveur et pagination complète dans l’interface               |
| Workspaces et rôles                               | Modèle relationnel, contrôle de membership, lecture seule VIEWER                      | Invitations, attribution de rôles, validation client et facturation multi-espace           |
| Rendus asynchrones                                | API, réservation atomique, outbox, BullMQ, worker, retries et restitution des crédits | Gateway/fournisseur vidéo réel, essais de charge et de reprise après incident              |
| API REST / webhooks                               | Endpoints internes avec cookie de session ; webhook opérateur HMAC et retries         | API publique à clés, quotas et abonnements webhook par client                              |
| PostgreSQL                                        | Schéma, migration initiale, index et Prisma                                           | Provisionnement et sauvegardes de la base cible                                            |
| Object storage                                    | Endpoint d’upload S3/R2 présigné                                                      | Interface d’assets, finalisation upload, contrôle de contenu et téléchargement privé signé |
| Redis                                             | Queue et rate limiting des opérations sensibles                                       | Monitoring, haute disponibilité et nettoyage des anciennes sessions                        |
| MCP tendances                                     | Non disponible                                                                        | Sources officielles/autorisées et serveur MCP ; aucune donnée live inventée                |
| MCP vision                                        | Non disponible                                                                        | Analyse visuelle et validation humaine des bénéfices non observables                       |
| Shopify / WooCommerce                             | Non disponible                                                                        | OAuth, synchronisation catalogue et permissions avis                                       |
| Starter / Pro / Agency                            | Présentation des prix et formule de crédits                                           | Validation du coût de revient, paiements, webhooks et droits d’offre                       |
| Affiliation                                       | Non disponible                                                                        | Attribution, commission, antifraude et relevés partenaires                                 |
| CI GitHub Actions                                 | Lint, types, Jest, build et Playwright avec PostgreSQL/Redis                          | Observer la première exécution GitHub et maintenir la couverture                           |
| CD Vercel / workers                               | Instructions de déploiement et Dockerfile worker                                      | Lier les comptes et configurer previews, secrets et scaling                                |
| Monitoring                                        | Logs techniques limités sans secrets ni corps des prompts                             | Sentry/Datadog, métriques de queue/coût, alertes et rétention                              |

## Règles de production déjà posées

- Les projets sont validés côté serveur ; aucun accès cloud sans session et membership.
- Les mutations par cookie exigent une origine identique. L’API publique à clés reste à développer.
- Une clé d’idempotence est unique par workspace. Un même rendu réserve ses crédits dans une transaction PostgreSQL et ne les réserve pas une seconde fois.
- Le worker utilise l’identifiant de rendu comme clé d’idempotence auprès du gateway. Celui-ci doit impérativement la respecter.
- Le coût est calculé sur un snapshot immuable : éditer ensuite un projet ne change pas le rendu déjà demandé.
- Un échec final rembourse une seule fois via transaction et contrainte unique du registre.
- La queue peut être reconstituée depuis les lignes QUEUED si l’envoi Redis échoue après la réservation.
- Les URL de vidéos finales exigent HTTPS et un nom d’hôte explicitement autorisé.
- Aucun scraping de lien arbitraire n’est implémenté dans cette version. L’import futur devra traiter SSRF, redirections, DNS et les règles des sources.
- Aucun témoignage fictif n’est ajouté par la composition locale ou demandé au générateur IA.
