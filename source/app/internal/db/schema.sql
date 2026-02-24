-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- create Key Value table
CREATE TABLE IF NOT EXISTS key_value (
    key text PRIMARY KEY,
    value text NOT NULL,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Request log table for idempotency with encryption
CREATE TABLE IF NOT EXISTS request_log (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trace_id text UNIQUE NOT NULL, -- for idempotency check
    caller_info text NOT NULL,
    reason text NOT NULL,
    encrypted_request_body BYTEA, -- encrypted using pgp_sym_encrypt
    encrypted_response_body BYTEA, -- encrypted using pgp_sym_encrypt
    key_version bigint NOT NULL,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_request_log_trace_id ON request_log(trace_id);

-- Person table - stores person data
CREATE TABLE IF NOT EXISTS person (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- internal service id
    client_id text UNIQUE NOT NULL, -- id from client system
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamptz -- soft delete support
);

CREATE INDEX idx_person_client_id ON person(client_id);

-- Person attributes table - one-to-many with person
CREATE TABLE IF NOT EXISTS person_attributes (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id UUID NOT NULL REFERENCES person(id) ON DELETE CASCADE,
    attribute_key citext NOT NULL,
    encrypted_value BYTEA, -- encrypted attribute value using pgp_sym_encrypt
    key_version bigint NOT NULL,
    version bigint NOT NULL DEFAULT 1, -- optimistic concurrency control
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(person_id, attribute_key) -- prevent duplicate attributes for same person
);

CREATE INDEX idx_person_attributes_person_id ON person_attributes(person_id);
CREATE INDEX idx_person_attributes_key ON person_attributes(attribute_key);

-- Person images table - stores encrypted images separately for performance
CREATE TABLE IF NOT EXISTS person_images (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id UUID NOT NULL REFERENCES person(id) ON DELETE CASCADE,
    attribute_key citext NOT NULL,
    image_type text NOT NULL, -- 'profile', 'document', 'id_card', etc.
    encrypted_image_data BYTEA NOT NULL, -- encrypted image using pgp_sym_encrypt
    key_version bigint NOT NULL DEFAULT 1, -- encryption key version
    mime_type text, -- 'image/jpeg', 'image/png', etc.
    file_size bigint, -- original file size in bytes
    width bigint,
    height bigint,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(person_id, attribute_key) -- prevent duplicate images for same person
);

CREATE INDEX idx_person_images_person_id ON person_images(person_id);
CREATE INDEX idx_person_images_type ON person_images(image_type);
