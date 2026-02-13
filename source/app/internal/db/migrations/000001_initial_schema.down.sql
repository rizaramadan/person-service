-- Drop indexes first
DROP INDEX IF EXISTS idx_person_images_type;
DROP INDEX IF EXISTS idx_person_images_person_id;
DROP INDEX IF EXISTS idx_person_attributes_key;
DROP INDEX IF EXISTS idx_person_attributes_person_id;
DROP INDEX IF EXISTS idx_person_client_id;
DROP INDEX IF EXISTS idx_request_log_trace_id;

-- Drop tables in reverse order (respecting foreign key constraints)
DROP TABLE IF EXISTS person_images;
DROP TABLE IF EXISTS person_attributes;
DROP TABLE IF EXISTS person;
DROP TABLE IF EXISTS request_log;
DROP TABLE IF EXISTS key_value;

-- Drop extensions
DROP EXTENSION IF EXISTS citext;
DROP EXTENSION IF EXISTS pgcrypto;
