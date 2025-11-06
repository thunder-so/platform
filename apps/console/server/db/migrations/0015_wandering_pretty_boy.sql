ALTER TABLE "providers" ALTER COLUMN "id" SET DATA TYPE uuid;
ALTER TABLE "providers" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();