-- Rascunhos de IA (Fase 6). Criada à mão, alinhada ao schema.

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "body" TEXT NOT NULL,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "sources" JSONB NOT NULL,
    "reviewFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GERADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Draft_storyId_idx" ON "Draft"("storyId");

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
