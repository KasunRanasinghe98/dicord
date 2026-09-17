-- AlterTable
ALTER TABLE "worker_profiles" ADD COLUMN     "nic" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "worker_profiles_nic_key" ON "worker_profiles"("nic");
