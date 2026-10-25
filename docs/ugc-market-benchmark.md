# Vidi — analyse concurrentielle et décisions produit

Étude des pages et documentations officielles consultées le 25 octobre 2026. Périmètre : huit acteurs représentatifs du marketing UGC, et non toutes les agences du marché. Les offres changent ; les fonctions annoncées ne constituent pas un benchmark de qualité des vidéos. Aucun compte payant, code interne, campagne client ni résultat privé n’a été examiné.

## Ce que vendent réellement les acteurs

| Acteur | Type | Fonctions documentées | Fonctionnement observable et intérêt pour Vidi |
| --- | --- | --- | --- |
| Arcads | Plateforme IA | Acteurs et clones, UGC et produit en main, sous-titres, transcription, traduction avec lip-sync, voix, B-rolls, images, variations et workflows | Le client apporte script/produit, choisit acteur et modèle, puis multiplie les créations. Reprendre la séparation script, casting, finitions et lots ; le nombre de modèles n’est pas une différenciation durable. |
| Creatify | Plateforme publicitaire IA | URL vers vidéo, agent créatif, avatars, produits, éditeur de flux, variantes, bibliothèque de publicités, suivi concurrentiel, lancement et analyse créative | Couvre découverte → création → diffusion → mesure. My Ads rapproche les créations des métriques Meta/TikTok et propose des améliorations. Vidi ne peut pas revendiquer l’invention de cette boucle. |
| HeyGen | Plateforme vidéo IA | Agent conversationnel ou automatique, scripts, choix des visuels, narration, transitions, sous-titres, avatars et Brand System | L’agent prépare un plan, produit la vidéo puis permet une retouche dans le studio. Intérêt : rendre le processus guidé et conserver les consignes de marque entre les étapes. |
| Topview | Plateforme vidéo marketing | Agent depuis une référence, canevas collaboratif, image/vidéo, produit-avatar, lip-sync, voix et clonage, URL vers vidéo, API asynchrone | Combine plusieurs outils et modèles dans un parcours. L’API sépare création de tâche, interrogation de statut, prévisualisation et export. Copier cette logique fonctionnelle exige de vrais services, pas seulement des boutons. |
| MakeUGC | Plateforme UGC IA | Acteurs, produit en main, avatars personnalisés, gestuelle/mouvement, B-rolls, montage, images, voix et langues, bibliothèque, workflows, lots, API/MCP et webhooks | Génère une création puis la décline ou l’insère dans un flux réutilisable. Les coûts et disponibilités dépendent des modèles et des crédits. |
| Billo | Créateurs humains et couche de performance | Briefs, candidatures et sélection, livraison de vidéos, scripts, appariement de créateurs, mashups et analyse créative | La marque définit le brief, sélectionne un créateur, expédie son produit et récupère une vidéo. CreativeOps ajoute des choix guidés par les données ; le service inclut du travail humain que Vidi ne remplace pas automatiquement. |
| Insense | Marketplace et campagnes créateurs | Briefs détaillés, livrables, consignes, formats, bibliothèque, collaboration multi-marques, droits d’usage, Partnership Ads et Spark Ads | Organise la relation marque/créateur, les accords et l’approbation du contenu. Intérêt : distinguer production, publication et autorisation publicitaire, et garder les responsabilités explicites. |
| Neads | Agence de services | Stratégie social media, studio de création vidéo, influence et Social Ads | Fournit expertise, conception et exécution adaptées aux réseaux. Une agence vend aussi le diagnostic, la sélection créative et le pilotage ; Vidi doit aider ces décisions, pas seulement accroître le volume. |

Les workflows ci-dessus décrivent les parcours publiés. Ils ne révèlent pas leur architecture interne, leurs prompts, leurs marges ni les performances reproductibles de leurs moteurs. Les chiffres commerciaux et comparaisons de rendement affichés par les fournisseurs n’ont pas été repris comme preuves indépendantes.

## Carte fonctionnelle face à Vidi

| Fonction de marché | Vidi avant cette livraison | Cette livraison | Travail restant |
| --- | --- | --- | --- |
| Import de produit | URL HTTPS publique, informations structurées et revue humaine | Conservé | OAuth Shopify/WooCommerce, catalogue et avis autorisés |
| Scripts | Hook/message/CTA, composition locale et LLM gratuit | Contexte de marque et arguments déclarés transmis au LLM ; URLs des preuves, notes et résultats exclus du prompt | Validation qualitative multilingue et apprentissage à partir de campagnes validées |
| Brief de marque | Informations produit uniquement | Marque, audience, objectif, ton, mentions requises et expressions à éviter par projet | Bibliothèque de kits partagés au niveau workspace |
| Arguments et sources | Bénéfices saisis par l’utilisateur | Jusqu’à huit arguments avec URL HTTPS et note de vérification ; repérage des formulations dans le script | Vérification documentaire, provenance d’extraits et validation métier |
| Tests créatifs | Duplication de projets | Jeux de 2–3 variantes depuis le script courant, accroche ou CTA, paramètres figés ; jusqu’à 24 variantes | Lots de rendus réellement exécutés et tests de casting, angle ou placement |
| Contrôle avant production | Estimation de durée | Détection indicative de longueur, mentions manquantes, mots à éviter, chiffres, promesses sensibles et expériences personnelles FR/EN | Alignement audio réel, contrôle de marque approfondi, autres langues et examen humain |
| Avatars et produit en main | Sélection illustrative | Aucun moteur prétendument activé | Modèle réel, droits sur les visages, tenue fidèle du produit, mains et gestes |
| Voix et clonage | Aperçu vocal système | Aucun clonage prétendument activé | TTS/clonage réel, consentement et hébergement de calcul |
| Montage, musique et sous-titres | Paramètres et segments de timeline | Conservé | Vrai montage/export, assets liés aux segments, alignement et licences musicales |
| Rendus | API et worker avec crédits/idempotence | Les métadonnées du laboratoire sont exclues de la requête au moteur vidéo | Moteur compatible, Redis/worker exploité, observabilité, reprise et charge |
| Performances | Aucune donnée publicitaire | Import CSV validé, aperçu avant remplacement, source/période/devise, CTR/CPC/CPA/ROAS déterministes | Connexions officielles Meta/TikTok, attribution normalisée, comparaison statistique |
| Collaboration | Rôles, invitations et validation par révision | Le brief, les preuves et les résultats suivent les projets locaux/cloud avec les contrôles existants | Commentaires par scène, portail et notifications client |
| Portabilité | Projet interne | Dossier JSON exportable avec brief, preuves, scripts, paramètres, résultats, contrôles et estimation des crédits | Import du dossier, adaptateurs et export vers moteurs/éditeurs tiers |
| Automatisation et API | API projets/rendus Agency, worker et webhook opérateur | Schéma de campagne accepté dans les projets existants | Webhooks par client et canevas d’automatisation |
| Publication et veille | Non connecté | Aucune veille/publication fictive | Sources sociales autorisées, droits et comptes publicitaires |

## Proposition de valeur à tester

**Vidi aide les petites équipes à préparer des tests explicables et à garder la maîtrise de leurs données : argument → source déclarée → variante figée → résultat importé → prochain choix créatif.**

Cette combinaison donne une direction concrète au produit :

1. Une variante change une seule composante du script. Cela facilite la lecture des différences sans attribuer automatiquement une hausse de ventes au script.
2. Les arguments disposent d’un lien de preuve et d’une note. Vidi distingue une correspondance textuelle d’une vérification de la vérité du produit.
3. Les résultats proviennent du client, avec contexte d’attribution et devise. Le classement reste descriptif ; aucune probabilité de succès ni promesse de ROAS n’est inventée.
4. Le dossier reste exportable sans abonnement à un moteur déterminé. Les données de performance et les notes privées ne sont pas envoyées au LLM ni au moteur de rendu.
5. La préparation fonctionne avant l’hébergement des modèles vidéo. Aucun coût de génération vidéo n’est engagé pour constituer un test.

**Différenciation proposée, pas exclusivité prouvée.** Plusieurs concurrents ont déjà la marque, les variantes ou l’analyse. Les pages examinées ne permettent pas d’affirmer qu’aucun ne possède cette combinaison ou une fonction équivalente derrière un compte. Il faut confronter cette proposition à des démonstrations et à des entretiens clients avant toute publicité comparative.

## Pourquoi ne pas tout empiler immédiatement

Le principal blocage reste la production d’une vidéo convaincante et fidèle au produit. Ajouter des interfaces pour des moteurs absents ne résout pas ce blocage. Ordre de développement recommandé :

- **Livré :** laboratoire de brief, preuves, tests, import de résultats et export ; persistance et validation côté serveur.
- **Prochain jalon :** brancher un TTS puis un avatar parlant open source sur un worker GPU ; mesurer temps, coût et qualité sur des exemples autorisés. Aucun équivalent au « produit en main » n’est garanti par le lip-sync seul.
- **Ensuite :** montage rendu, B-rolls, sous-titres alignés et génération de lots avec plafond de crédits et approbation.
- **Après validation des usages :** OAuth e-commerce, connexions publicitaires, analyse des scènes et automatisation. Les intégrations utilisent les comptes et permissions du client.

La copie concerne les capacités et parcours utiles. Le code, les textes, les vidéos de démonstration et les identités des concurrents ne sont pas reproduits.

## Sources officielles

- Arcads : [guide de la plateforme](https://help.arcads.ai/en/articles/15503340-everything-you-can-do-on-arcads-complete-platform-guide), [parcours UGC](https://help.arcads.ai/en/articles/17595045-how-do-i-make-an-ai-ugc-ad-in-arcads).
- Creatify : [plateforme](https://creatify.ai/), [My Ads](https://help.creatify.ai/en/articles/11475777-my-ads), [Winning Ads](https://help.creatify.ai/en/articles/11475779-winning-ads). Certaines pages anciennes décrivent des fonctions à venir ; la disponibilité n’a pas été testée dans un compte.
- HeyGen : [Video Agent](https://help.heygen.com/en/articles/12402907-how-to-get-started-with-video-agent), [présentation](https://www.heygen.com/agent).
- Topview : [guide officiel](https://www.topview.ai/guides/topview-official-guide), [API marketing vidéo](https://docs.topview.ai/reference/getting-started-1).
- MakeUGC : [plateforme et fonctions](https://makeugc.ai/).
- Billo : [fonctionnement](https://help.billo.app/en/articles/10368596-how-does-billo-work), [CreativeOps](https://billo.app/creativeops/), [guide CreativeOps](https://help.billo.app/en/articles/13282767-getting-started-with-creativeops).
- Insense : [brief de campagne](https://help-creators.insense.pro/4525), [plans et fonctions](https://insense.pro/pricing), [droits numériques](https://help.insense.pro/4243).
- Neads : [expertises de l’agence](https://neads.io/).
