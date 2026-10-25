-- AlterTable
ALTER TABLE "Render" ADD COLUMN     "outputAssetId" TEXT;

-- CreateTable
CREATE TABLE "ServiceConnection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "sealedSecret" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceAssetId" TEXT,
    "consentUserId" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "VoiceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceGeneration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "emotion" TEXT NOT NULL,
    "status" "RenderStatus" NOT NULL DEFAULT 'QUEUED',
    "outputAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceConnection_workspaceId_provider_key" ON "ServiceConnection"("workspaceId", "provider");

-- CreateIndex
CREATE INDEX "VoiceProfile_workspaceId_consentAt_idx" ON "VoiceProfile"("workspaceId", "consentAt");

-- CreateIndex
CREATE INDEX "VoiceGeneration_workspaceId_status_idx" ON "VoiceGeneration"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceGeneration_workspaceId_idempotencyKey_key" ON "VoiceGeneration"("workspaceId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "ServiceConnection" ADD CONSTRAINT "ServiceConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceProfile" ADD CONSTRAINT "VoiceProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceProfile" ADD CONSTRAINT "VoiceProfile_sourceAssetId_fkey" FOREIGN KEY ("sourceAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceGeneration" ADD CONSTRAINT "VoiceGeneration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceGeneration" ADD CONSTRAINT "VoiceGeneration_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "VoiceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

