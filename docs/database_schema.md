# Database Schema Specification

This document details the relational (PostgreSQL), time-series (TimescaleDB), and vector (Pinecone) database schemas for the **FIFA World Cup 2026 Smart Stadium Operations Platform**.

---

## 1. PostgreSQL Schema (Relational Data)

This schema governs core stadium operations, user access control, match scheduling, resource allocation, and incident response tracking.

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User Roles: Operator, Security, Volunteer, Fan, Transit Coordinator
CREATE TYPE user_role AS ENUM ('operator', 'security', 'volunteer', 'fan', 'transit', 'admin');

-- Incident Severity levels
CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Incident Status levels
CREATE TYPE incident_status AS ENUM ('reported', 'dispatched', 'mitigating', 'resolved');

-- 1. Users Table
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    role user_role NOT NULL DEFAULT 'fan',
    language_pref VARCHAR(10) DEFAULT 'en',
    accessibility_pref JSONB DEFAULT '{"screen_reader": false, "wheelchair_routing": false}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Stadiums Table
CREATE TABLE stadiums (
    stadium_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(50) NOT NULL,
    capacity INT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    timezone VARCHAR(50) NOT NULL
);

-- 3. Gate Configurations
CREATE TABLE gates (
    gate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stadium_id UUID REFERENCES stadiums(stadium_id) ON DELETE CASCADE,
    gate_name VARCHAR(50) NOT NULL,
    current_status VARCHAR(50) DEFAULT 'open',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL
);

-- 4. Matches Table
CREATE TABLE matches (
    match_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stadium_id UUID REFERENCES stadiums(stadium_id),
    team_a VARCHAR(100) NOT NULL,
    team_b VARCHAR(100) NOT NULL,
    match_time TIMESTAMP WITH TIME ZONE NOT NULL,
    ticket_sales_count INT DEFAULT 0
);

-- 5. Incident Reports Table
CREATE TABLE incidents (
    incident_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stadium_id UUID REFERENCES stadiums(stadium_id),
    title VARCHAR(150) NOT NULL,
    description TEXT,
    severity severity_level NOT NULL DEFAULT 'low',
    status incident_status NOT NULL DEFAULT 'reported',
    reported_by UUID REFERENCES users(user_id),
    assigned_team_id UUID, -- References staff/volunteer team
    gps_coordinates POINT, -- (Latitude, Longitude)
    ai_mitigation_plan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 6. Resource Allocations Table (Staff/Volunteer rosters)
CREATE TABLE resource_allocations (
    allocation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(match_id),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    zone_assigned VARCHAR(50) NOT NULL, -- e.g., 'Gate C', 'Stand 104'
    shift_start TIMESTAMP WITH TIME ZONE NOT NULL,
    shift_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled'
);

-- Indexing for optimized joins and geospatial queries
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_incidents_status_severity ON incidents(status, severity);
CREATE INDEX idx_allocations_match ON resource_allocations(match_id, user_id);
```

---

## 2. TimescaleDB Schema (Time-Series Telemetry)

This database captures telemetry from IoT crowd sensors, BLE beacons, smart water meters, power grid controllers, and shuttle GPS trackers.

```sql
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- 1. Crowd Density logs (IoT / Ticketing velocity)
CREATE TABLE crowd_telemetry (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    sensor_id VARCHAR(50) NOT NULL,
    stadium_id UUID NOT NULL,
    zone_id VARCHAR(50) NOT NULL,
    people_count INT NOT NULL,
    velocity_mps DOUBLE PRECISION, -- Average movement speed in meters/second
    risk_index DOUBLE PRECISION NOT NULL -- Computed 0.0 to 1.0 risk index
);

-- Partition this table into a hypertable by time (7-day intervals)
SELECT create_hypertable('crowd_telemetry', 'time', chunk_time_interval => INTERVAL '7 days');

-- 2. Environmental & Sustainability telemetry (ESG Data)
CREATE TABLE sustainability_telemetry (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    stadium_id UUID NOT NULL,
    resource_type VARCHAR(50) NOT NULL, -- 'energy_kwh', 'water_liters', 'co2_tons', 'waste_kg'
    sensor_id VARCHAR(50) NOT NULL,
    current_value DOUBLE PRECISION NOT NULL,
    baseline_value DOUBLE PRECISION
);

SELECT create_hypertable('sustainability_telemetry', 'time', chunk_time_interval => INTERVAL '7 days');

-- 3. Transportation Telemetry (Shuttles and Parking)
CREATE TABLE transit_telemetry (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    shuttle_id VARCHAR(50) NOT NULL,
    route_id VARCHAR(50) NOT NULL,
    current_occupancy INT NOT NULL,
    gps_coordinates POINT NOT NULL,
    speed_kmh DOUBLE PRECISION NOT NULL
);

SELECT create_hypertable('transit_telemetry', 'time', chunk_time_interval => INTERVAL '1 day');

-- Create compression policies for optimization (Save up to 90% disk space)
ALTER TABLE crowd_telemetry SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'sensor_id, zone_id'
);
SELECT add_compression_policy('crowd_telemetry', INTERVAL '30 days');
```

---

## 3. Pinecone Vector Schema (RAG Knowledge Base)

To support the **Operations Copilot** and **Fan Assistant**, all stadium guides, manuals, and policy books are segmented and vector indexed in Pinecone.

### Index Configuration
* **Dimension**: 1536 (standard for OpenAI `text-embedding-3-small` or `text-embedding-004`)
* **Metric**: Cosine similarity

### Metadata Payload Structure
Each vector stored in Pinecone includes a metadata payload for filtering:
```json
{
  "document_id": "sop-evac-2026-v2",
  "document_title": "FIFA World Cup 2026 Stadium Evacuation Guidelines",
  "source_url": "https://internal.fifa.org/ops/docs/evacuation_guidelines.pdf",
  "category": "emergency_sop",
  "stadium_scope": "all",
  "language": "en",
  "chunk_index": 42,
  "chunk_text": "In the event of a fire alert near Gate C, security staff must redirect fans to exit via Gate D. Do not use elevators. Sound the auxiliary sirens and activate the high-contrast lighting path towards the central plaza."
}
```

### Search Filter Optimization Pattern
When the AI Service queries Pinecone, it passes runtime metadata filters to ensure document relevance and isolation:
```python
query_response = index.query(
    vector=[0.015, -0.024, 0.081, ...], # Embedding of: "How do we handle exit routing at Gate C?"
    top_k=3,
    filter={
        "category": {"$in": ["emergency_sop", "venue_maps"]},
        "language": "en"
    },
    include_metadata=True
)
```
