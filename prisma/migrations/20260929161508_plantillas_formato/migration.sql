-- CreateTable
CREATE TABLE "plantillas_formato" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "html" TEXT NOT NULL,
    "css" TEXT NOT NULL,
    "projectData" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plantillas_formato_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plantillas_formato_tipo_idx" ON "plantillas_formato"("tipo");

-- CreateIndex
CREATE INDEX "plantillas_formato_tipo_activo_idx" ON "plantillas_formato"("tipo", "activo");
