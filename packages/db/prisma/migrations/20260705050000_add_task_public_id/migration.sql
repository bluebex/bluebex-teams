-- AlterTable
ALTER TABLE "Task" ADD COLUMN "publicId" VARCHAR(7);

CREATE OR REPLACE FUNCTION generate_task_public_id() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..7 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  r RECORD;
  pid TEXT;
BEGIN
  FOR r IN SELECT id FROM "Task" WHERE "publicId" IS NULL LOOP
    LOOP
      pid := generate_task_public_id();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "Task" WHERE "publicId" = pid);
    END LOOP;
    UPDATE "Task" SET "publicId" = pid WHERE id = r.id;
  END LOOP;
END $$;

DROP FUNCTION generate_task_public_id();

ALTER TABLE "Task" ALTER COLUMN "publicId" SET NOT NULL;
