# System Architecture Specification - Smart Stadium Operations Platform

This document describes the high-level design, components, AI workflow, data flow, and scalability strategies for the **FIFA World Cup 2026 Smart Stadium Operations Platform**.

---

## 1. High-Level Architecture Overview

The system is designed as a cloud-native, distributed event-driven platform capable of handling millions of concurrent fan connections and thousands of high-velocity IoT sensors, CCTV YOLO video feeds, and emergency alerts.

```mermaid
graph TD
    %% Client Tier
    subgraph Client Tier
        FanApp[Flutter Mobile App]
        OpsPortal[Next.js Command Center Portal]
        SecurityPortal[Next.js Security HUD]
    end

    %% Edge Tier
    subgraph Edge & API Tier
        Envoy[Envoy API Gateway / Load Balancer]
        AuthService[OIDC Identity Provider Keycloak]
    end

    %% Event Stream & Ingestion Tier
    subgraph Ingestion & Message Broker
        Kafka[Apache Kafka Message Hub]
        Flink[Apache Flink Stream Processor]
    end

    %% Application Microservices Tier
    subgraph Core Microservices
        FastAPI_AI[FastAPI AI & RAG Copilot Service]
        FastAPI_Transit[FastAPI Transportation Analytics Service]
        FastAPI_Crowd[FastAPI Crowd Control Service]
        FastAPI_Alerts[FastAPI Incident Response Service]
    end

    %% Storage & Database Tier
    subgraph Storage Tier
        Postgres[(PostgreSQL Master Database)]
        Timescale[(TimescaleDB IoT Telemetry)]
        Pinecone[(Pinecone Vector Database)]
        Redis[(Redis Cache & Session Store)]
    end

    %% External & Sensor Feeds
    subgraph Physical Infrastructure
        CCTV[CCTV Camera Feeds YOLO Agents]
        IoT[BLE Beacons, GPS, Smart Parking]
        TransitAPIs[Metro & Bus API Feeds]
    end

    %% Connections
    CCTV -->|RTSP / WebSockets| FastAPI_Crowd
    IoT -->|MQTT / Kafka Ingestion| Kafka
    TransitAPIs -->|REST polling| Kafka
    
    Kafka --> Flink
    Flink -->|Enriched Stream| Postgres
    Flink -->|Real-time Telemetry| Timescale
    
    FanApp -->|GraphQL / WSS| Envoy
    OpsPortal -->|REST / WSS| Envoy
    SecurityPortal -->|REST / WSS| Envoy

    Envoy -->|Token Verification| AuthService
    Envoy --> FastAPI_AI
    Envoy --> FastAPI_Transit
    Envoy --> FastAPI_Crowd
    Envoy --> FastAPI_Alerts

    FastAPI_AI --> Pinecone
    FastAPI_AI --> Redis
    FastAPI_Crowd --> Redis
    FastAPI_Transit --> Timescale
    FastAPI_Alerts --> Postgres
```

---

## 2. Component Breakdowns

### Client Tier
* **Fan Mobile App**: Cross-platform client written in Flutter. Leverages Mapbox SDK for indoor routing, offline BLE beacons, and speech synthesis APIs for accessibility.
* **Operations Command Center Portal**: High-fidelity dashboard built using Next.js, React Leaflet for GIS coordinates, and Chart.js for real-time analytics.
* **Security HUD**: Tactical operator dashboard specializing in CCTV stream processing, bounding-box overlays, risk scoring, and real-time alert notifications.

### Ingestion & Stream Processing Tier
* **Apache Kafka**: Serves as the central commit log. Telemetry, ticketing logs, and parking data are sent to specific Kafka topics (e.g., `stadium.iot.crowd-density`, `stadium.incident.alerts`).
* **Apache Flink**: Performs windowed aggregations on crowd sensor telemetry and ticket-scanning velocities to detect bottlenecks and compute 15-minute predictive congestion scores.

### Application Services Tier (FastAPI & Python AI)
* **AI & RAG Copilot Service**: Host LLM agents using FastAPI. Connects with LangChain to run prompt workflows, query the vector store for stadium SOPs, and translate queries to 50+ languages.
* **Crowd Control & Vision Service**: Receives frame-metadata from local edge YOLO containers, maps camera telemetry coordinates to GIS digital twins, and updates Redis with live crowd heatmaps.
* **Incident & Resource Allocation Service**: Computes staffing workloads and volunteer requirements using a MILP (Mixed-Integer Linear Programming) optimizer.

### Data Storage Tier
* **PostgreSQL (Multi-AZ)**: Structured system records including user accounts, incident reports, volunteer rosters, match details, and ticket status.
* **TimescaleDB**: PostgreSQL extension optimized for time-series. Captures all sensor readings (temperatures, carbon count, queue sizes) for long-term historical trends.
* **Pinecone**: Managed vector database. Indexes all semantic fragments of stadium manuals, FIFA safety guides, and venue SOPs.
* **Redis Enterprise**: Sub-millisecond key-value store for active sessions, user locations, websocket connection mappings, and local geo-fencing caches.

---

## 3. Core AI Workflows

### 3.1. RAG & Knowledge Hub Workflow
```mermaid
sequenceDiagram
    autonumber
    actor Operator
    participant Copilot as FastAPI AI Service
    participant Redis as Redis Cache
    participant Pinecone as Pinecone DB
    participant LLM as Gemini Ultra API

    Operator->>Copilot: Ask: "What is the evacuation SOP for Gate B?"
    Copilot->>Redis: Check semantic query cache
    Alt Cache Hit
        Redis-->>Copilot: Return cached response
    Else Cache Miss
        Copilot->>Copilot: Compute Query Vector (text-embedding-004)
        Copilot->>Pinecone: Query top 3 chunks (stadium_manuals index)
        Pinecone-->>Copilot: Return relevant chunks (SOP text sections)
        Copilot->>LLM: Generate response (System prompt + Chunks + Operator query)
        LLM-->>Copilot: Return formatted answer & citations
        Copilot->>Redis: Cache response (TTL 10m)
    End
    Copilot-->>Operator: Display markdown response & action links
```

### 3.2. Computer Vision & Congestion Mitigation Workflow
```mermaid
sequenceDiagram
    autonumber
    participant Camera as CCTV Camera Feed
    participant Edge as Edge YOLO Processor
    participant Service as FastAPI Crowd Service
    participant Kafka as Kafka Queue
    participant Flink as Flink Event Processor
    participant Ops as Operations Command Dashboard

    Camera->>Edge: Stream video frames (RTSP)
    Edge->>Edge: Detect objects, count humans & compute velocity
    Edge->>Service: Send JSON frame metadata (CameraID, Count, Density)
    Service->>Kafka: Publish to `stadium.iot.crowd-density` topic
    Kafka->>Flink: Process sliding windows (10-minute window)
    Flink->>Flink: Predict threshold breaches (>0.8 risk rating)
    Flink->>Ops: Emit dynamic websocket alert: "Bottleneck predicted at Gate C in 15 mins"
    Ops->>Ops: Render alert highlight & suggest staff redistribution plan
```

---

## 4. Technology Stack Justification

| Technology | Selected For | Rationale |
| :--- | :--- | :--- |
| **FastAPI (Python)** | Backend Services | High execution speed, asynchronous event loops, native support for Pydantic type validation, and direct compatibility with machine learning runtimes (PyTorch, YOLO, OpenCV). |
| **Next.js & React** | Web Dashboard | Server-Side Rendering (SSR) for initial load efficiency, modular component reuse, clean React context-state, and strong typing with TypeScript. |
| **Pinecone** | Vector DB | Fully managed serverless scaling, high query throughput, sub-50ms latency, and robust support for metadata filtering based on stadium location or language. |
| **TimescaleDB** | Time-Series Data | Combines the full query power and transaction safety of PostgreSQL with optimized indexing structures (hypertables) for high-frequency IoT telemetry. |
| **Kafka & Flink** | Stream Processing | Standard enterprise solution for decoupling ingestion from analytical workloads. Guarantees "at-least-once" delivery, vital for emergency incident handling. |
| **Envoy Gateway** | API Gateway | Handles token translation, rate limiting, and seamless routing for both HTTP/gRPC traffic and persistent WebSocket channels. |

---

## 5. Scalability & Availability Strategy

* **Horizontal Pod Autoscaling (HPA)**: Deploy microservices on Kubernetes (EKS/GKE). Scale pods dynamically based on target CPU (>70%) and concurrent WebSocket connection metrics.
* **Geo-Distributed Edge CDN**: Use Cloudflare to cache static assets, maps, and multilingual translation models close to fans in the US, Mexico, and Canada.
* **Read-Replication & Connection Pooling**: Implement PgBouncer for PostgreSQL database pools. Route read operations to read-replicas while keeping write traffic on the master instance.
* **WebSocket Sharding**: Route WebSocket connections through a Redis Pub/Sub backplane, allowing fans to receive localized stadium broadcasts even when connected to different physical server pods.
