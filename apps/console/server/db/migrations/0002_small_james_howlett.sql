ALTER TABLE "domains" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "domains_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "installations" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "installations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "memberships" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "memberships_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "plans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);

SELECT setval(pg_get_serial_sequence('domains', 'id'), (SELECT MAX(id) FROM domains));
SELECT setval(pg_get_serial_sequence('installations', 'id'), (SELECT MAX(id) FROM installations));
SELECT setval(pg_get_serial_sequence('memberships', 'id'), (SELECT MAX(id) FROM memberships));
SELECT setval(pg_get_serial_sequence('payments', 'id'), (SELECT MAX(id) FROM payments));
SELECT setval(pg_get_serial_sequence('plans', 'id'), (SELECT MAX(id) FROM plans));
