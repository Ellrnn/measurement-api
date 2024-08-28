CREATE TABLE IF NOT EXISTS measure_read(
    measure_read_id SERIAL PRIMARY KEY,
    image_url VARCHAR(255),
    measure_value INT,
    measure_uuid VARCHAR(255)
)