"""Script de démonstration de rendu vidéo UGC autonome VIDI avec FFmpeg natif."""
import base64
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'apps/media'))
from pipeline import compose

def create_product_image(path: Path) -> str:
    """Génère un visuel produit élégant (flacon cosmétique Lumé) avec PIL."""
    img = Image.new('RGB', (720, 720), color=(15, 17, 23))
    draw = ImageDraw.Draw(img)
    
    # Fond dégradé subtil
    for y in range(720):
        r = int(18 + (y / 720) * 15)
        g = int(20 + (y / 720) * 12)
        b = int(28 + (y / 720) * 35)
        draw.line([(0, y), (720, y)], fill=(r, g, b))
    
    # Cercle lumineux en arrière-plan
    draw.ellipse([160, 120, 560, 520], fill=(45, 30, 80), outline=(168, 85, 247), width=2)
    draw.ellipse([210, 170, 510, 470], fill=(70, 35, 110))
    
    # Flacon stylisé
    draw.rounded_rectangle([290, 260, 430, 520], radius=18, fill=(240, 242, 248), outline=(255, 255, 255), width=3)
    # Bouchon pipette
    draw.rounded_rectangle([325, 200, 395, 260], radius=8, fill=(20, 20, 25), outline=(168, 85, 247), width=2)
    draw.rectangle([345, 160, 375, 200], fill=(168, 85, 247))
    
    # Étiquette du flacon
    draw.rounded_rectangle([310, 330, 410, 450], radius=6, fill=(20, 22, 30))
    draw.text((330, 350), "LUMÉ", fill=(255, 255, 255))
    draw.text((325, 375), "SÉRUM V1", fill=(168, 85, 247))
    draw.text((320, 400), "RECHARGE", fill=(148, 163, 184))
    
    # Badges UGC
    draw.rounded_rectangle([60, 60, 260, 110], radius=12, fill=(236, 72, 153))
    draw.text((80, 75), "★ COUP DE COEUR UGC", fill=(255, 255, 255))
    
    img.save(path, format="JPEG", quality=95)
    return 'data:image/jpeg;base64,' + base64.b64encode(path.read_bytes()).decode('ascii')

def main():
    root = Path(__file__).resolve().parents[1]
    renders_dir = root / 'apps/web/public/renders'
    renders_dir.mkdir(parents=True, exist_ok=True)
    target_mp4 = renders_dir / 'vidi-ugc-demo.mp4'
    
    with tempfile.TemporaryDirectory() as temp_dir:
        work = Path(temp_dir)
        product_img_path = work / 'product.jpg'
        b64_image = create_product_image(product_img_path)
        
        project = {
            'title': 'Sérum Lumé UGC Ad',
            'duration': 15,
            'resolution': '720p',
            'aspectRatio': '9:16',
            'subtitleStyle': 'tiktok-punchy',
            'language': 'fr',
            'emotion': 'energetic',
            'avatarId': 'lea',
            'voiceId': 'claire',
            'captions': True,
            'product': {
                'name': 'Sérum Lumé',
                'description': 'Le premier sérum hydratant rechargeable aux actifs naturels certifiés.',
                'image': b64_image,
            },
            'script': {
                'hook': "Arrêtez d'acheter des crèmes hydratantes qui s'évaporent en 10 minutes !",
                'body': "Ce sérum rechargeable pénètre instantanément sans aucun film gras. Votre peau reste éclatante toute la journée.",
                'cta': "Cliquez sur le lien pour commander avec 20% de réduction immédiate !",
            },
            'media': {
                'kind': 'product',
                'narration': 'none',
            },
            'clips': [
                {'id': 'c1', 'kind': 'product', 'label': 'Présentation Flacon', 'start': 0.0, 'duration': 5.0},
                {'id': 'c2', 'kind': 'product', 'label': 'Zoom Texture', 'start': 5.0, 'duration': 6.0},
                {'id': 'c3', 'kind': 'product', 'label': 'Offre Spéciale', 'start': 11.0, 'duration': 4.0},
            ]
        }
        
        print(">> Lancement du rendu FFmpeg multi-pistes...")
        output_file = compose(project, work)
        shutil.copy2(output_file, target_mp4)
        
        # Copie dans le répertoire brain de l'agent si présent
        brain_dir = Path("C:/Users/mon pc/.gemini/antigravity-ide/brain/f931ddd7-e681-437c-8ebb-ddb1222295e0")
        if brain_dir.is_dir():
            shutil.copy2(output_file, brain_dir / 'vidi-ugc-demo.mp4')
            
        # Sondage technique via ffprobe
        raw_probe = subprocess.check_output([
            'ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(target_mp4)
        ])
        info = json.loads(raw_probe)
        v_stream = next(s for s in info['streams'] if s['codec_type'] == 'video')
        
        print(">> RENDU RÉUSSI AVEC SUCCÈS !")
        print(f"Fichier : {target_mp4}")
        print(f"Taille : {target_mp4.stat().st_size / 1024:.1f} KB")
        print(f"Format : {v_stream['width']}x{v_stream['height']} ({project['aspectRatio']})")
        print(f"Codec : {v_stream['codec_name']}")
        print(f"Durée : {float(info['format']['duration']):.1f} secondes")
        print(f"Style de sous-titres : {project['subtitleStyle']}")

if __name__ == '__main__':
    main()
