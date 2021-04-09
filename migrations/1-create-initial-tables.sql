CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id uuid DEFAULT gen_random_uuid (),
    email VARCHAR NOT NULL,
    master_hash VARCHAR,
    PRIMARY KEY (id)
);

CREATE TABLE access_tokens (
    id uuid DEFAULT gen_random_uuid (),
    user_id uuid NOT NULL,
    access_token uuid NOT NULL,
    device_id VARCHAR NOT NULL,
    initial_device_display_name VARCHAR,
    created_at timestamptz DEFAULT NOW(),
    accessed_at timestamptz,
    PRIMARY KEY (id),
    CONSTRAINT fk_user
      FOREIGN KEY(user_id) 
	  REFERENCES users(id)
);

CREATE TABLE user_rsa_keys (
    id uuid DEFAULT gen_random_uuid (),
    user_id uuid NOT NULL,
    public_key VARCHAR NOT NULL,
    private_key VARCHAR NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_user
      FOREIGN KEY(user_id) 
	  REFERENCES users(id)
);

CREATE TABLE user_sym_keys (
    id uuid DEFAULT gen_random_uuid (),
    user_id uuid NOT NULL,
    sym_key VARCHAR NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_user
      FOREIGN KEY(user_id) 
	  REFERENCES users(id)
);
