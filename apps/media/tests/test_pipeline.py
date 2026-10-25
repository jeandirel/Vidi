import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pipeline import compose, transfer, subtitles
class PipelineTests(unittest.TestCase):
    def test_real_ffmpeg_renders_vertical_mp4_with_captions(self):
        with tempfile.TemporaryDirectory() as folder:
            project = {'duration':15, 'resolution':'720p', 'language':'fr', 'emotion':'warm', 'voiceId':'claire', 'avatarId':'lea', 'captions':True, 'product':{'image':''}, 'script':{'hook':'Découvrez Lumé.', 'body':'Un flacon rechargeable.', 'cta':'Voir la fiche.'}, 'media':{'kind':'product','narration':'none'}}
            output = compose(project, Path(folder))
            info = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(output)]))
            self.assertEqual(info['streams'][0]['width'], 720)
            self.assertEqual(info['streams'][0]['height'], 1280)
            self.assertAlmostEqual(float(info['format']['duration']), 15, places=1)
            self.assertEqual(info['streams'][0]['codec_name'], 'h264')
            self.assertGreater(output.stat().st_size, 1000)
    def test_transfer_rejects_untrusted_hosts_credentials_and_plain_http(self):
        with patch.dict(os.environ, {'MEDIA_TRANSFER_HOSTS':'storage.example.com'}):
            for url in ['http://storage.example.com/x', 'https://127.0.0.1/x', 'https://storage.example.com.evil.com/x', 'https://user:secret@storage.example.com/x']:
                with self.assertRaises(ValueError): transfer(url, destination=Path('/unused'))
    def test_subtitle_content_cannot_inject_ass_style_or_html(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder)/'captions.srt'
            subtitles({'hook':'<font>test</font>', 'body':r'{\an9}body', 'cta':'Next'},15,target)
            text = target.read_text()
            self.assertNotIn('<font>',text)
            self.assertNotIn(r'{\an9}',text)
            self.assertIn('00:00:15,000', text)
    def test_clone_never_falls_back_to_a_standard_voice(self):
        with tempfile.TemporaryDirectory() as folder:
            project = {'duration':15, 'resolution':'720p','language':'fr','emotion':'warm','voiceId':'claire','avatarId':'lea','captions':False,'product':{'image':''},'script':{'hook':'Hi','body':'Text','cta':'Go'},'media':{'kind':'product','narration':'clone'}}
            with patch.dict(os.environ, {'MEDIA_ENABLE_TTS':'false'}):
                with self.assertRaises(ValueError): compose(project,Path(folder))
if __name__ == '__main__': unittest.main()
