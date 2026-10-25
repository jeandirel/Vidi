import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
ROOT = tempfile.TemporaryDirectory()
os.environ['MEDIA_DATA_DIR'] = ROOT.name
os.environ['MEDIA_GATEWAY_TOKEN'] = 'test-only-' + 'a'*48
from fastapi.testclient import TestClient
import server
class ServerTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(server.app)
        self.headers = {'Authorization':'Bearer ' + os.environ['MEDIA_GATEWAY_TOKEN']}
        with server.database() as db: db.execute('DELETE FROM jobs')
    def job(self):
        return {'id':'test-job','kind':'voice','text':'Bonjour le monde','referenceUrl':'https://storage.example.com/input','uploadUrl':'https://storage.example.com/output'}
    def test_health_and_jobs_require_authentication(self):
        self.assertEqual(self.client.get('/health').status_code,401)
        self.assertEqual(self.client.get('/health',headers=self.headers).status_code,200)
        self.assertEqual(self.client.post('/jobs',json=self.job()).status_code,401)
    def test_idempotency_deduplicates_and_rejects_changed_text(self):
        with patch.object(server.POOL,'submit') as pool:
            self.assertEqual(self.client.post('/jobs',json=self.job(),headers=self.headers).status_code,202)
            self.assertEqual(self.client.post('/jobs',json=self.job(),headers=self.headers).status_code,202)
            self.assertEqual(pool.call_count,1)
            changed = {**self.job(),'text':'Another text'}
            self.assertEqual(self.client.post('/jobs',json=changed,headers=self.headers).status_code,409)
            self.assertEqual(self.client.get('/jobs/test-job',headers=self.headers).json(),{'status':'QUEUED'})
    def test_path_traversal_oversize_and_missing_consent_reference_are_rejected(self):
        self.assertEqual(self.client.post('/jobs',json={**self.job(),'id':'../private'},headers=self.headers).status_code,400)
        self.assertEqual(self.client.post('/jobs',json={**self.job(),'referenceUrl':None},headers=self.headers).status_code,400)
        self.assertEqual(self.client.post('/jobs',content=b'a'*2000001,headers=self.headers).status_code,413)
if __name__ == '__main__': unittest.main()
