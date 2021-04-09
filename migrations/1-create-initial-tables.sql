CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id uuid DEFAULT gen_random_uuid (),
    email VARCHAR NOT NULL,
    master_hash VARCHAR,
    PRIMARY KEY (id)
);
