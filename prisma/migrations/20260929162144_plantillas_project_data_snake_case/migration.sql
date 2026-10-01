/*
  Warnings:

  - You are about to drop the column `projectData` on the `plantillas_formato` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "plantillas_formato" DROP COLUMN "projectData",
ADD COLUMN     "project_data" JSONB NOT NULL DEFAULT '{}';
