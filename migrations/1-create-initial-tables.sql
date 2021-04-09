CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id uuid DEFAULT gen_random_uuid (),
    first_name VARCHAR,
    last_name VARCHAR,
    email VARCHAR NOT NULL,
    master_hash VARCHAR,
    PRIMARY KEY (id)
);
