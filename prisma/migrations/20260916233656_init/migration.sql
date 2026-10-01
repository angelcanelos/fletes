-- CreateTable
CREATE TABLE "formatos" (
    "id" SERIAL NOT NULL,
    "folio" TEXT,
    "productor" TEXT NOT NULL,
    "grua" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "fecha_texto" TEXT,
    "producto_fsc" TEXT,
    "destino" TEXT NOT NULL DEFAULT '',
    "generos" JSONB NOT NULL DEFAULT '[]',
    "ajustes" JSONB NOT NULL DEFAULT '[]',
    "iva_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.16,
    "isr_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.0125,
    "observaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'guardado',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fletes" (
    "id" SERIAL NOT NULL,
    "folio" TEXT,
    "fletero" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "fecha_texto" TEXT,
    "lineas" JSONB NOT NULL DEFAULT '[]',
    "precio_flete" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ajustes" JSONB NOT NULL DEFAULT '[]',
    "iva_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.16,
    "retencion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.04,
    "isr_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.0125,
    "observaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'guardado',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fletes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("clave")
);

-- CreateIndex
CREATE INDEX "formatos_fecha_idx" ON "formatos"("fecha");

-- CreateIndex
CREATE INDEX "formatos_grua_idx" ON "formatos"("grua");

-- CreateIndex
CREATE INDEX "formatos_productor_idx" ON "formatos"("productor");

-- CreateIndex
CREATE INDEX "fletes_fecha_idx" ON "fletes"("fecha");

-- CreateIndex
CREATE INDEX "fletes_fletero_idx" ON "fletes"("fletero");
