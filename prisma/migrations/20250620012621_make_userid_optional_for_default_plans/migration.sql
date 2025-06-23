/*
  Warnings:

  - You are about to drop the column `age` on the `UserProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MealPlan" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "UserProfile" DROP COLUMN "age",
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "objectiveWeight" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "WorkoutPlan" ALTER COLUMN "userId" DROP NOT NULL;
