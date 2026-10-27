import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.HEYGEN_API_KEY?.trim();

if (!apiKey) {
  console.error('❌ HEYGEN_API_KEY manquante dans .env');
  process.exit(1);
}

const text = process.argv[2] || 
  "Arrêtez tout ! Si vous cherchez un sérum visage vraiment efficace et rechargeable, regardez ça. Il pénètre en trois secondes, hydrate en profondeur et ne colle pas. Cliquez sur le lien pour profiter de l'offre spéciale !";

const avatarId = process.argv[3] || 'Abigail_expressive_2024112501'; // HeyGen Léa avatar
const voiceId = process.argv[5] || 'b11a7dbb250f483eadad9fb253e7d313'; // French female
const ratio = process.argv[4] || '9:16';

const dimensions = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
}[ratio] || { width: 1080, height: 1920 };

console.log('='.repeat(65));
console.log('  VIDI — GÉNÉRATION VIDÉO UGC RÉELLE AVEC AVATAR HEYGEN');
console.log('='.repeat(65));
console.log(`👤 Avatar HeyGen : ${avatarId}`);
console.log(`🗣️ Voix HeyGen : ${voiceId}`);
console.log(`📐 Format : ${ratio} (${dimensions.width}x${dimensions.height})`);
console.log(`📝 Script : "${text}"\n`);
console.log('🚀 Envoi de la demande de génération à l\'API HeyGen v2...');

try {
  const payload = {
    video_inputs: [
      {
        character: {
          type: 'avatar',
          avatar_id: avatarId,
          avatar_style: 'normal',
        },
        voice: {
          type: 'text',
          input_text: text,
          voice_id: voiceId,
          speed: 1.0,
        },
        background: {
          type: 'color',
          value: '#090a0f',
        },
      },
    ],

    dimension: dimensions,
    aspect_ratio: ratio,
    test: false,
    caption: true,
  };

  const genRes = await fetch('https://api.heygen.com/v2/video/generate', {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000),
  });

  if (!genRes.ok) {
    const errorText = await genRes.text();
    console.error(`\n❌ Échec de génération (${genRes.status}) :`, errorText);
    process.exit(1);
  }

  const genData = await genRes.json();
  const videoId = genData.data?.video_id;

  if (!videoId) {
    console.error('\n❌ Aucun video_id retourné par HeyGen :', genData);
    process.exit(1);
  }

  console.log(`\n✅ Tâche acceptée par HeyGen ! ID de la vidéo : ${videoId}`);
  console.log('⏳ Synthèse de l\'avatar parlant en cours...');

  const startTime = Date.now();
  let completed = false;

  while (!completed) {
    await new Promise((r) => setTimeout(r, 6000));
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    const statusRes = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`, {
      headers: { 'X-Api-Key': apiKey },
      signal: AbortSignal.timeout(30000),
    });

    if (!statusRes.ok) continue;

    const statusData = await statusRes.json();
    const status = statusData.data?.status;

    process.stdout.write(`\r⌛ Statut : ${status?.toUpperCase()} (${elapsed}s écoulées)...   `);

    if (status === 'completed' && statusData.data?.video_url) {
      completed = true;
      console.log('\n\n🎉 VIDÉO HEYGEN GÉNÉRÉE AVEC SUCCÈS !');
      console.log('='.repeat(65));
      console.log(`🎬 URL de la vidéo haute définition :`);
      console.log(`👉 ${statusData.data.video_url}`);
      console.log('='.repeat(65));
      break;
    }

    if (status === 'failed') {
      console.error('\n\n❌ La génération a échoué chez HeyGen :', statusData.data?.error);
      process.exit(1);
    }
  }
} catch (error) {
  console.error('\n❌ Erreur :', error.message);
  process.exit(1);
}
