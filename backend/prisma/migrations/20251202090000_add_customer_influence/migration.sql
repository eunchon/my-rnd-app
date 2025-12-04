-- Add customer influence scoring columns
ALTER TABLE "Request" ADD COLUMN "influenceRevenue" INTEGER DEFAULT 0;
ALTER TABLE "Request" ADD COLUMN "influenceCustomer" INTEGER DEFAULT 0;
ALTER TABLE "Request" ADD COLUMN "influenceCustomization" INTEGER DEFAULT 0;
ALTER TABLE "Request" ADD COLUMN "influenceStrategy" INTEGER DEFAULT 0;
ALTER TABLE "Request" ADD COLUMN "influenceTender" INTEGER DEFAULT 0;
ALTER TABLE "Request" ADD COLUMN "influenceTotal" INTEGER DEFAULT 0;
