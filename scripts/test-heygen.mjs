import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.HEYGEN_API_KEY?.trim();

console.log('='.repeat(60));
console.log('       VIDI — VÉRIFICATION DU MOTEUR D\'AVATAR HEYGEN');
console.log('='.repeat(60));

if (!apiKey) {
  console.log('\n❌ HEYGEN_API_KEY est manquante dans votre fichier .env');
  console.log('\nPour activer les vrais avatars ultra-réalistes :');
  console.log('1. Connectez-vous sur https://app.heygen.com');
  console.log('2. Rendez-vous dans Space Settings > API');
  console.log('3. Copiez votre clé API');
  console.log('4. Ajoutez la ligne suivante dans votre fichier .env :');
  console.log('   HEYGEN_API_KEY=votre_cle_heygen_ici');
  console.log('5. Relancez ce script : node scripts/test-heygen.mjs\n');
  process.exit(1);
}

console.log(`\n🔑 Clé HeyGen détectée : ${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`);
console.log('📡 Test de connectivité avec l\'API HeyGen v2...');

try {
  const res = await fetch('https://api.heygen.com/v2/avatars', {
    headers: {
      'X-Api-Key': apiKey,
    },
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`\n❌ Échec d'authentification HeyGen (${res.status}) :`);
    console.error(errorText);
    process.exit(1);
  }

  const data = await res.json();
  const count = (data.data?.avatars?.length || 0) + (data.data?.talking_photos?.length || 0);
  console.log(`\n✅ Authentification HeyGen RÉUSSIE !`);
  console.log(`👤 ${count} avatars et visages ultra-réalistes accessibles.`);

  console.log('\n🚀 Le moteur HeyGen est 100% prêt à générer vos publicités UGC réelles !');
  console.log('='.repeat(60));
} catch (error) {
  console.error('\n❌ Erreur réseau lors de la connexion à HeyGen :', error.message);
  process.exit(1);
}
