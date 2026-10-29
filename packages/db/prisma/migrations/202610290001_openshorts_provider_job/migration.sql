-- Persist the OpenShorts job ID before polling to avoid duplicate paid submissions
-- after a worker retry. A SUBMITTING sentinel requires manual reconciliation.
ALTER TABLE "Render" ADD COLUMN "providerJobId" TEXT;
