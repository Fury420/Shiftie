-- One-time: spusti v termináli prod DB (psql alebo iný klient).
-- Označí migrácie 0000–0004 ako aplikované, aby pri ďalšom deployi pobežali len 0005 a 0006.

CREATE SCHEMA IF NOT EXISTS drizzle;

CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

-- Vloží len ak daný created_at ešte neexistuje (môžeš spustiť viackrát).
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '8e30d1ff40cf7c96f31ed56f929520108c39709fc28858d14066b31616cfe47b', 1772123041377
WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1772123041377);

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '6d02a08450447c7cad26a72c3256a3c35d5bee454659a866d827358945c36228', 1772536411868
WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1772536411868);

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '9bfa447dfdb9fcd46a8a9d3ef1f52f6cc1d0042823e54a3674994491d3b07bb0', 1772629048184
WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1772629048184);

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT 'd25fadf47a722ae199a46ebd232c6f55945a6dae9591b2b3220acc113457629d', 1772666457604
WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1772666457604);

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '1b3bfe6ab22c649e28a3e7cc79bd7ac0a952cc0309f9a95393b2b6182218f89a', 1772666863188
WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1772666863188);
