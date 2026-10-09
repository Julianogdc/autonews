-- Fatos e alertas (Fase 5). Criada à mão, alinhada ao schema.

-- AlterTable
ALTER TABLE "Article" ADD COLUMN "factsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Fact" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "raw" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Fact_articleId_idx" ON "Fact"("articleId");

-- CreateIndex
CREATE INDEX "Alert_storyId_idx" ON "Alert"("storyId");

-- AddForeignKey
ALTER TABLE "Fact" ADD CONSTRAINT "Fact_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
