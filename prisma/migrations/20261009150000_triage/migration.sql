-- Triagem (Fase 3): nota, prioridade e motivos de cada matéria. Criada à mão, alinhada ao schema.

-- AlterTable
ALTER TABLE "Article" ADD COLUMN "score" INTEGER,
ADD COLUMN "priority" TEXT,
ADD COLUMN "reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "triagedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Article_triagedAt_idx" ON "Article"("triagedAt");
