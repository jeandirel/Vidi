# Vidi — Activer le pipeline UGC Gemini Omni / HeyGen / ElevenLabs

## État réel
- Les scènes vidéo sont demandées à l'API Google Gemini Omni Flash (REST Interactions, `gemini-omni-1.1-flash`), puis assemblées par FFmpeg dans le worker BullMQ.
- Pour un projet `media.kind=avatar`, HeyGen génère le présentateur, sa voix et son lip-sync; le B-roll Google est incrusté au milieu du clip.
- Pour un projet `media.kind=product` (ou ancien projet sans `media`), Gemini produit un plan vidéo, bouclé jusqu'à la durée demandée, avec voix off ElevenLabs si les deux variables sont configurées, sous-titres approximatifs et visuel source du produit incrusté en fin de vidéo.
- L'image produit importée est validée et conservée comme référence, mais la fidélité du produit généré par le modèle Google ne peut pas être garantie; les bénéfices et avis ne doivent pas être inventés.
- Le MP4 final est envoyé dans un bucket S3/R2 privé et associé au rendu via `outputAssetId`.
- Aucun média n'est généré automatiquement lors du déploiement, aucun appel d'API payant n'est effectué sans demande de rendu par l'utilisateur, et aucune vidéo réelle n'a été vérifiée sans clés.

## Clés à ajouter (sur le serveur, jamais NEXT_PUBLIC_)

| Variable | Origine | Utilité |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio | Vidéo B-roll `gemini-omni-1.1-flash` |
| `GEMINI_VIDEO_MODEL` | Valeur `gemini-omni-1.1-flash` | Modèle vidéo, ne pas utiliser les anciens IDs Preview Veo |
| `HEYGEN_API_KEY` | HeyGen, Space Settings > API | Présentateur/avatar parlant + lip-sync |
| `ELEVENLABS_API_KEY` | ElevenLabs, Developers > API keys | Narration TTS pour les vidéos produit |
| `ELEVENLABS_VOICE_ID` | ElevenLabs, bibliothèque de voix | ID de voix autorisée, indispensable avec la clé TTS |
| `ELEVENLABS_MODEL` | Valeur `eleven_multilingual_v2` | Modèle TTS multilingue |
| `VIDEO_OUTPUT_HOSTS` | Facultatif, liste des domaines exacts autorisés | Autoriser si la livraison HeyGen provient d'un domaine différent de ceux intégrés |

## Infrastructure à configurer sur le web ET dans le worker
- `DATABASE_URL` : Neon PostgreSQL, tenant existant.
- `REDIS_URL` : Redis avec protocole `rediss://`, **BullMQ nécessite Redis TCP**. Un simple endpoint Upstash REST ne suffit pas.
- `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` : bucket privé R2/S3; autorisations PutObject, HeadObject, GetObject.
- Exécuter durablement `npm run worker` avec `apps/worker/Dockerfile` (Docker contient FFmpeg), distinctement de Vercel. Ne pas lancer le worker dans une route API Next.js ou un job de build.
- Vercel héberge le frontend/API; le moteur d'encodage et les appels longs s'exécutent **hors Vercel**.
- Les variables du worker ne sont pas automatiquement partagées avec Vercel : injecter les clés nécessaires dans les deux environnements suivant le fournisseur; les clés Gemini/HeyGen/ElevenLabs ne sont nécessaires qu'au worker, mais le serveur web doit aussi voir Gemini/HeyGen pour afficher la capacité vidéo.

## Processus de validation (après configuration)
1. Vérifier l'état de `/api/capabilities?workspaceId=<id>` pour un utilisateur connecté.
2. Importer une fiche produit réelle et contrôler les bénéfices et images.
3. Générer un projet `media.kind=product` de 15 ou 30 secondes. Vérifier le rendu terminé, les crédits débités une seule fois, le MP4 téléchargeable et le ratio.
4. Générer un projet `media.kind=avatar` avec une voix autorisée, puis contrôler la synchronisation et les plans B-roll.
5. Vérifier les échecs (clé invalide, quota, service indisponible), les remboursements de crédits et la confidentialité des fichiers privés.

## Limitations connues
- Le rendu voix off produit est optionnel; sans ElevenLabs il conserve le son natif du modèle ou une vidéo sans son.
- Les sous-titres du chemin produit sont synchronisés par sections estimées et non au mot.
- Les modèles peuvent déformer l'apparence d'un produit. Contrôle humain nécessaire avant publication.
- La génération de la scène Google est facturée à la requête. Un échec après appel fournisseur peut coûter des crédits fournisseur même si Vidi rembourse ses propres crédits.
- Le système ne fournit pas encore de montage agentique multi-scènes avancé, scoring automatique de fidélité ni garanties commerciales comparables à Creatify. Ne pas annoncer ces capacités comme déjà livrées.
