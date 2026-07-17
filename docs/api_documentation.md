# API Documentation

This document describes the API interface designs supporting HTTP/REST services, GraphQL queries for the Fan Mobile App, and real-time WebSocket channels for the Operations Command Center.

---

## 1. REST API (Operations & Admin Management)

Exposed by the Core FastAPI services on `https://api.stadiumops.fifa2026.org/v1/`.

### 1.1. Incidents & Emergencies

#### Create Incident
* **Endpoint**: `POST /incidents`
* **Security**: Authentication token required (`role` in `['operator', 'security', 'volunteer']`).
* **Request Payload**:
  ```json
  {
    "stadium_id": "4a71720a-7b3e-436d-9273-0ff019088711",
    "title": "Medical: Heat Exhaustion at Stand 104",
    "description": "Fan reporting severe dizziness and dehydration in row G.",
    "severity": "medium",
    "gps_coordinates": {
      "latitude": 34.052234,
      "longitude": -118.243684
    }
  }
  ```
* **Response**: `201 Created`
  ```json
  {
    "incident_id": "8b8efc81-8cb5-4672-9118-202246cf3f99",
    "status": "reported",
    "assigned_team_id": null,
    "ai_mitigation_plan": "1. Dispatch Med Team Delta from Gate B (nearest transit time: 2m 14s).\n2. Alert nearby volunteer unit V-12 to provide shade and water.\n3. Log incident on central command deck.",
    "created_at": "2026-07-17T08:34:00Z"
  }
  ```

#### Update Incident Status
* **Endpoint**: `PATCH /incidents/{incident_id}`
* **Request Payload**:
  ```json
  {
    "status": "mitigating",
    "assigned_team_id": "2d0d0f41-0b5c-4448-a003-8d63991278ff"
  }
  ```
* **Response**: `200 OK`

---

### 1.2. AI Operations Copilot Query

* **Endpoint**: `POST /copilot/query`
* **Request Payload**:
  ```json
  {
    "query": "Which gate is most congested and how should we redistribute?",
    "stadium_id": "4a71720a-7b3e-436d-9273-0ff019088711"
  }
  ```
* **Response**: `200 OK`
  ```json
  {
    "query": "Which gate is most congested and how should we redistribute?",
    "answer": "Currently, **Gate B** is showing high congestion with an average queue wait time of **24 minutes** (risk index: **0.82**). Over the next 15 minutes, ticket-scanning velocity forecasts indicate queue sizes will increase by 10%.",
    "recommendation": "Redistribute incoming fan flows: reroute 25% of traffic arriving from the North Transit Hub to **Gate A** (wait time: 6 minutes). Staffing adjustments: Deploy 4 floating volunteers from internal concourse Area 3 to Gate B ticketing booths.",
    "actionable_triggers": [
      {
        "action": "reroute_signage",
        "parameters": {
          "source": "North Hub Path",
          "target": "Gate A"
        }
      },
      {
        "action": "reallocate_staff",
        "parameters": {
          "team": "V-Floaters-3",
          "destination": "Gate B",
          "count": 4
        }
      }
    ]
  }
  ```

---

## 2. GraphQL API (Fan Mobile App)

Exposed on `https://api.stadiumops.fifa2026.org/graphql`. Used by mobile apps to efficiently request specific data in a single round-trip.

### 2.1. Query: Get Fan Navigation Info
```graphql
query GetFanDashboard($matchId: ID!, $fanLocation: GPSInput!) {
  match(id: $matchId) {
    teamA
    teamB
    matchTime
  }
  closestGate(location: $fanLocation) {
    gateName
    queueWaitMinutes
    status
  }
  recommendedRoute(from: $fanLocation, preferences: { wheelchairAccessible: true }) {
    steps {
      instruction
      distanceMeters
      coordinates {
        latitude
        longitude
      }
    }
    estimatedDurationMinutes
  }
}
```

### 2.2. Mutation: Report Emergency
```graphql
mutation ReportEmergency($input: EmergencyReportInput!) {
  reportEmergency(input: $input) {
    success
    incidentId
    message
  }
}
```

---

## 3. WebSockets (Real-Time Streams)

Established via `wss://stream.stadiumops.fifa2026.org/ws/`.

### 3.1. Server-to-Client telemetry streams

#### Subscription Request (Command Center Client)
```json
{
  "event": "subscribe",
  "topic": "stadium.telemetry.crowd",
  "token": "eyJhbGciOiJIUzI1NiIsIn..."
}
```

#### Server Broadcast Event (Crowd Density Updates)
```json
{
  "topic": "stadium.telemetry.crowd",
  "timestamp": 1784354040,
  "data": {
    "stadium_id": "4a71720a-7b3e-436d-9273-0ff019088711",
    "zones": [
      { "zone": "Gate A", "density": 0.32, "wait_time_mins": 6 },
      { "zone": "Gate B", "density": 0.85, "wait_time_mins": 24 },
      { "zone": "Gate C", "density": 0.54, "wait_time_mins": 11 },
      { "zone": "Gate D", "density": 0.21, "wait_time_mins": 4 }
    ],
    "hotspots": [
      {
        "latitude": 34.052410,
        "longitude": -118.243810,
        "description": "Concourse bottlenecks near Food Stand 12"
      }
    ]
  }
}
```

### 3.2. Real-Time Multilingual Translation Channel
Used by fans for voice-to-voice translation conversations at volunteer stations.
* **Client Audio Frame**: binary packets containing PCM 16kHz audio.
* **Server Text Frame (Transcription)**:
  ```json
  {
    "channel": "translation",
    "role": "fan",
    "text": "Where is the wheelchair elevator?",
    "lang": "en"
  }
  ```
* **Server Audio Response Frame**: Translated voice audio payload returned in real-time (e.g. in Spanish/French) to be played back immediately by the volunteer's mobile handset.
