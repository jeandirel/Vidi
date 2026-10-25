# Utiliser le laboratoire Vidi

1. Dans le studio, renseigner le produit et préparer un script complet.
2. Ouvrir **Laboratoire → Brief & preuves**. Définir marque, audience, objectif et ton. Saisir une mention par ligne dans les listes. Ajouter les arguments accompagnés d’une URL HTTPS ; une source est déclarée par l’utilisateur, pas vérifiée automatiquement.
3. Revenir au studio et choisir la rédaction IA si souhaité. Le consentement existant s’applique aussi au brief et aux formulations des arguments. Les URLs de preuve, notes, résultats et images ne sont pas envoyés au modèle. Le contrôle de gratuité reste actif.
4. Dans **Tests créatifs**, choisir accroche ou CTA et écrire une ou deux alternatives. Le script courant constitue la référence. La préparation ne lance aucun rendu et ne débite aucun crédit. Un maximum de 24 variantes est autorisé par projet.
5. Ouvrir une variante dans le studio pour travailler dessus. Les paramètres enregistrés au moment du test restent dans le dossier. Modifier ensuite le script n’altère pas les résultats historiques. Il faut enregistrer les versions et utiliser les bons identifiants lors de la diffusion.
6. Dans **Résultats**, télécharger le modèle CSV et y reporter les chiffres de sa plateforme publicitaire. Les identifiants doivent correspondre aux variantes du test ; ne pas utiliser les noms de campagne externes sans les mapper. Le CSV n’est pas un import universel natif Meta/TikTok.
7. Renseigner source, période/règle d’attribution et devise unique. Les nombres utilisent un point décimal, sans séparateur de milliers. Les séparateurs CSV virgule et point-virgule sont acceptés. Maximum 100 Ko et 24 lignes de résultats. Les lignes dupliquées, identifiants inconnus, formules et valeurs invalides bloquent tout l’import.
8. Vérifier l’aperçu et confirmer. Cet import remplace le précédent ; il ne les additionne pas. Un réimport identique ne double donc pas les résultats. Enregistrer localement ou en ligne pour conserver le dossier. Un import invalide conserve les résultats précédents.
9. Exporter le dossier JSON pour partager scripts, preuves, paramètres, résultats, contrôles et estimation. Cet export volontaire contient des données de campagne, sans image embarquée, secret de connexion ni vidéo. L’import de ce dossier n’est pas implémenté.

## Métriques

- CTR = clics / impressions × 100.
- CPC = dépenses / clics (disponible dans le calcul métier).
- CPA = dépenses / conversions.
- ROAS = revenus / dépenses, dans la même devise.
- Dénominateur nul : valeur absente affichée « — », jamais zéro inventé.

Les coûts indiqués sont les crédits Vidi de la formule actuelle pour la durée/résolution, pas un devis GPU ni une garantie de disponibilité du moteur. Le classement n’est pas un test de significativité. La distribution publicitaire, les audiences et l’attribution peuvent expliquer les différences. Pas de lancement automatique de publicité.

## Données, schémas et limites

Le champ facultatif `campaign` est inclus dans le JSON d’un projet ; aucun changement SQL n’est nécessaire. Les anciens projets restent acceptés. Les limites et liens entre résultats et variantes sont vérifiés côté serveur par `projectSchema`. Le même contrôle de workspace, rôle et révision s’applique. La préparation est possible hors connexion cloud ; enregistrer un brouillon exige toujours un produit et un script complets.

Chaque lot de test fige le texte, la langue, le casting, la voix, l’émotion, la durée et la résolution. Les clips de montage ne sont pas des snapshots de vidéo. Le rendu effectif, sa qualité et les différences de montage doivent être contrôlés séparément avant un test publicitaire.

Les contrôles textuels sont indicatifs : estimation de lecture à 2,4 mots/s, recherche de mentions/exclusions, reconnaissance simple FR/EN de certaines promesses et expériences, chiffres à vérifier. Ils ne vérifient ni la vérité d’un argument ni le contenu de l’URL. Faux positifs et faux négatifs possibles. Aucun avis juridique ou prédiction marketing n’est produit.

Les métadonnées du laboratoire sont stockées avec le projet mais exclues du corps envoyé au moteur vidéo par le worker. Le provider reçoit les données de création nécessaires, comme auparavant. Le LLM ne reçoit que le brief et le texte des arguments, pas les notes ou résultats publicitaires.
