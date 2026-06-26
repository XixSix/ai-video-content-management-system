/*
  Warnings:

  - You are about to drop the `ai_suggestions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ai_suggestions" DROP CONSTRAINT "ai_suggestions_project_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_suggestions" DROP CONSTRAINT "ai_suggestions_user_id_fkey";

-- DropTable
DROP TABLE "ai_suggestions";
