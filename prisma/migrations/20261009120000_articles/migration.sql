-- Tabela de matérias detectadas (Fase 2). Criada à mão, alinhada ao schema.

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "author" TEXT,
    "category" TEXT,
    "imageUrl" TEXT,
    "imageCredit" TEXT,
    "text" TEXT,
    "textPurgeAt" TIMESTAMP(3),
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'NOVA',

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Article_url_key" ON "Article"("url");
