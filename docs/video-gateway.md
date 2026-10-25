# Contrat du gateway vidéo

Le worker ne prétend pas intégrer un fournisseur d’avatars. Il attend un service de confiance configuré par l’opérateur. Ce service devra orchestrer les API de génération, le TTS, le lip-sync, les médias et le montage.

## Requête

`POST VIDEO_GATEWAY_URL`, HTTPS uniquement.

Headers : `Authorization: Bearer <token>`, `Idempotency-Key: <render.id>`, `Content-Type: application/json`.

```json
{
  "id": "identifiant-rendu",
  "workspaceId": "identifiant-espace",
  "project": {
    "title": "Campagne produit",
    "product": {
      "name": "Produit",
      "description": "Description vérifiée",
      "url": "",
      "audience": "",
      "benefits": [],
      "image": ""
    },
    "script": { "hook": "Accroche", "body": "Message", "cta": "Action" },
    "avatarId": "lea",
    "voiceId": "claire",
    "language": "fr",
    "emotion": "warm",
    "duration": 15,
    "resolution": "720p",
    "captions": true,
    "clips": []
  }
}
```

Les identifiants de casting/voix sont des directions de création internes. Le gateway devra les associer à des ressources générables et autorisées chez le fournisseur. Les portraits illustratifs stockés dans le dépôt ne doivent pas être transmis à une API d’animation sans droits appropriés.

## Réponse synchrone

Statut 200 et JSON `{"videoUrl":"https://media.example.com/renders/output.mp4"}`. Le worker accepte uniquement HTTPS, sans identifiants dans l’URL, et un hostname exactement inclus dans `VIDEO_OUTPUT_HOSTS` (liste séparée par des virgules).

Le délai maximal est de cinq minutes par tentative. Le worker réessaie trois fois avec backoff ; le gateway doit retrouver la même opération à chaque réessai et ne pas refacturer. Pour les rendus plus longs, remplacer ce contrat synchrone par des tâches fournisseur persistées avec polling/webhook avant d’ouvrir le service au public. Le gateway doit implémenter lui-même la politique d’accès aux médias et la conservation des rendus.

## Notification opérateur

Le worker envoie un événement `render.completed` ou `render.failed` vers l’URL HTTPS fixe `WEBHOOK_URL` si `WEBHOOK_SECRET` est configuré. Cette intégration globale est réservée au backend de confiance de l’opérateur.

Vérifier `X-Vidi-Signature` avec HMAC-SHA256 de `X-Vidi-Event-Id + '.' + rawBody`, secret partagé et comparaison en temps constant. Dédupliquer durablement par identifiant d’événement ; accepter les répétitions avec une réponse 2xx. Huit tentatives sont prévues. Les messages de la queue sont conservés pour diagnostic après épuisement.

La publication du résultat en base et l’insertion de la notification Redis ne sont pas une transaction distribuée : une coupure exactement entre les deux peut nécessiter une réconciliation opérateur. Un outbox webhook transactionnel doit être ajouté avant une garantie de livraison contractuelle.

## Moteur natif auto-hébergeable

Le mode historique reste supporté. L’alternative `MEDIA_GATEWAY_URL` / `MEDIA_GATEWAY_TOKEN` utilise le [service média fourni](../apps/media/README.md) : tâches asynchrones persistées, polling, Chatterbox/MuseTalk optionnels, transfert direct vers stockage privé et résultats signés à la demande. Le worker donne la priorité au mode natif lorsque ses deux variables sont présentes. Ne pas configurer ce mode tant que son endpoint HTTPS et ses ressources ne sont pas opérationnels.

Dans ce mode, les événements opérateur fournissent `outputAssetId` et `downloadPath` au lieu d’un lien vidéo public permanent. L’accès au téléchargement exige une session ou une clé API Agency autorisée pour le workspace.
