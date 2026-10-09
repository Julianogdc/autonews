-- Conferência dos rascunhos (Fase 6): afirmações que não aparecem nas fontes. Criada à mão, alinhada ao schema.

-- AlterTable
ALTER TABLE "Draft" ADD COLUMN "unsupported" TEXT[] DEFAULT ARRAY[]::TEXT[];
