CREATE TYPE measure_type_enum AS ENUM ('WATER', 'GAS');


CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS measure_read (
    measure_read_id SERIAL PRIMARY KEY,
    measure_uuid UUID DEFAULT Uuid_generate_v4() UNIQUE NOT NULL,
    measure_datetime TIMESTAMP,
    measure_type measure_type_enum,
    measure_value INT,
    has_confirmed BOOLEAN DEFAULT FALSE,

    image_url VARCHAR(255),

    customer_code UUID NOT NULL
);
