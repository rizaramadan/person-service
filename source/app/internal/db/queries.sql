-- name: HealthCheck :exec
-- Perform a simple health check query  
SELECT 1;

-- name: GetValue :one
-- Retrieve a value by key
SELECT value FROM key_value WHERE key = $1 LIMIT 1;

-- name: SetValue :exec
-- Set a value by key
INSERT INTO key_value (key, value) VALUES ($1, $2)
ON CONFLICT (key) DO UPDATE SET value = $2;

-- name: DeleteValue :exec
-- Delete a value by key
DELETE FROM key_value WHERE key = $1;
