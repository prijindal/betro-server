CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE user_sym_keys (
    id uuid DEFAULT gen_random_uuid (),
    sym_key VARCHAR NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE users (
    id uuid DEFAULT gen_random_uuid (),
    email VARCHAR NOT NULL,
    username VARCHAR NOT NULL,
    master_hash VARCHAR UNIQUE NOT NULL,
    sym_key_id uuid NOT NULL,
    PRIMARY KEY (id),
    UNIQUE(email),
    UNIQUE(username),
    CONSTRAINT fk_sym_key
      FOREIGN KEY(sym_key_id) 
	  REFERENCES user_sym_keys(id)
    ON DELETE CASCADE
);

CREATE TABLE access_tokens (
    id uuid DEFAULT gen_random_uuid (),
    user_id uuid NOT NULL,
    access_token_hash VARCHAR UNIQUE NOT NULL,
    device_id VARCHAR UNIQUE NOT NULL,
    device_display_name VARCHAR,
    created_at timestamptz DEFAULT NOW(),
    accessed_at timestamptz,
    PRIMARY KEY (id),
    CONSTRAINT fk_user
      FOREIGN KEY(user_id) 
	  REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE user_profile (
  id uuid DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_picture VARCHAR,
  PRIMARY KEY (id),
  CONSTRAINT fk_user
    FOREIGN KEY(user_id) 
  REFERENCES users(id)
  ON DELETE CASCADE
);

CREATE TABLE user_echd_keys (
  id UUID DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  public_key VARCHAR NOT NULL,
  private_key VARCHAR NOT NULL,
  claimed BOOLEAN DEFAULT FALSE,
  created_at timestamptz DEFAULT NOW(),
  CONSTRAINT fk_user
    FOREIGN KEY(user_id) 
    REFERENCES users(id)
    ON DELETE CASCADE,
  PRIMARY KEY (id)
);


CREATE TABLE profile_grants (
  id uuid DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL, /* User whose profile we are referring */
  grantee_id uuid NOT NULL, /* User to which this grant is being made */
  user_key_id uuid,
  grantee_key_id uuid,
  user_profile_id uuid,
  encrypted_sym_key VARCHAR,
  granted BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (id),
  CONSTRAINT fk_user
    FOREIGN KEY(user_id) 
  REFERENCES users(id)
  ON DELETE CASCADE,
  CONSTRAINT fk_grantee
    FOREIGN KEY(grantee_id) 
  REFERENCES users(id)
  ON DELETE CASCADE,
  CONSTRAINT fk_user_key
    FOREIGN KEY(user_key_id) 
  REFERENCES user_echd_keys(id)
  ON DELETE CASCADE,
  CONSTRAINT fk_grantee_key
    FOREIGN KEY(grantee_key_id) 
  REFERENCES user_echd_keys(id)
  ON DELETE CASCADE,
  CONSTRAINT fk_user_profile
    FOREIGN KEY(user_profile_id) 
  REFERENCES user_profile(id)
  ON DELETE CASCADE
);

CREATE TABLE group_policies (
    id uuid DEFAULT gen_random_uuid (),
    user_id uuid NOT NULL,
    key_id uuid NOT NULL,
    name VARCHAR NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (id),
    CONSTRAINT fk_user
      FOREIGN KEY(user_id) 
	  REFERENCES users(id)
    ON DELETE CASCADE,
    CONSTRAINT fk_sym_key
      FOREIGN KEY(key_id)
	  REFERENCES user_sym_keys(id)
    ON DELETE CASCADE
);

CREATE TABLE group_follow_approvals (
    id uuid DEFAULT gen_random_uuid (),
    user_id uuid NOT NULL,
    followee_id uuid NOT NULL,/* This means user_id follows followee_id */
    encrypted_sym_key VARCHAR,
    user_key_id uuid,
    followee_key_id uuid,
    group_id uuid,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at timestamptz DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT fk_user
      FOREIGN KEY(user_id) 
	  REFERENCES users(id)
    ON DELETE CASCADE,
    CONSTRAINT fk_followee
      FOREIGN KEY(followee_id) 
	  REFERENCES users(id)
    ON DELETE CASCADE,
    CONSTRAINT fk_user_key
      FOREIGN KEY(user_key_id) 
    REFERENCES user_echd_keys(id)
    ON DELETE CASCADE,
    CONSTRAINT fk_followee_key
      FOREIGN KEY(followee_key_id) 
    REFERENCES user_echd_keys(id)
    ON DELETE CASCADE,
    CONSTRAINT fk_group
      FOREIGN KEY(group_id)
	  REFERENCES group_policies(id)
    ON DELETE CASCADE,
    UNIQUE (user_id, followee_id)
);

CREATE TABLE posts (
    id uuid DEFAULT gen_random_uuid (),
    user_id uuid NOT NULL,
    group_id uuid NOT NULL,
    key_id uuid NOT NULL,
    text_content VARCHAR,
    media_content VARCHAR,
    media_encoding VARCHAR,
    created_at timestamptz DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT fk_user
      FOREIGN KEY(user_id) 
	  REFERENCES users(id)
    ON DELETE CASCADE,
    CONSTRAINT fk_group
      FOREIGN KEY(group_id)
	  REFERENCES group_policies(id)
    ON DELETE CASCADE,
    CONSTRAINT fk_sym_key
      FOREIGN KEY(key_id)
	  REFERENCES user_sym_keys(id)
    ON DELETE CASCADE
);

CREATE TABLE post_likes (
    id uuid DEFAULT gen_random_uuid (),
    user_id uuid NOT NULL,
    post_id uuid NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT fk_user
      FOREIGN KEY(user_id) 
    REFERENCES users(id),
    CONSTRAINT fk_post
      FOREIGN KEY(post_id) 
    REFERENCES posts(id)
);

CREATE TYPE user_settings_type as ENUM ('notification_on_approved', 'notification_on_followed', 'allow_search');

CREATE TABLE user_settings (
  id UUID DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type user_settings_type NOT NULL,
  enabled BOOLEAN NOT NULL,
  CONSTRAINT fk_user
    FOREIGN KEY(user_id) 
    REFERENCES users(id)
    ON DELETE CASCADE,
  PRIMARY KEY (id),
  UNIQUE (user_id, type)
);

CREATE TYPE user_notifications_action as ENUM ('notification_on_approved', 'notification_on_followed');

CREATE TABLE user_notifications (
  id UUID DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action user_notifications_action NOT NULL,
  read boolean DEFAULT FALSE,
  content VARCHAR NOT NULL,
  payload JSONB NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  CONSTRAINT fk_user
    FOREIGN KEY(user_id) 
    REFERENCES users(id)
    ON DELETE CASCADE,
  PRIMARY KEY (id)
);

CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  sender_key_id uuid NOT NULL,
  receiver_key_id uuid NOT NULL,
  CONSTRAINT fk_sender
    FOREIGN KEY(sender_id) 
    REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_receiver
    FOREIGN KEY(receiver_id) 
    REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_sender_key
    FOREIGN KEY(sender_key_id) 
    REFERENCES user_echd_keys(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_receiver_key
    FOREIGN KEY(receiver_key_id) 
    REFERENCES user_echd_keys(id)
    ON DELETE CASCADE,
  PRIMARY KEY (id)
);

CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  message VARCHAR NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  CONSTRAINT fk_coversation
    FOREIGN KEY(conversation_id) 
    REFERENCES conversations(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_sender
    FOREIGN KEY(sender_id) 
    REFERENCES users(id)
    ON DELETE CASCADE,
  PRIMARY KEY (id)
);