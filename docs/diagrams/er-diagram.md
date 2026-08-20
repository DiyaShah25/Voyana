# Voyana Database ER Diagrams (VPM-26)

This document contains the Entity-Relationship (ER) models for the Voyana collaborative travel platform.

## 1. Core Domain ER Model (Users, Trips, Collaboration)

```mermaid
erDiagram
    USER ||--o{ TRIP_MEMBER : "participates in"
    USER ||--o{ EXPENSE : "pays / splits"
    USER ||--o{ CHAT_MESSAGE : "sends"
    
    TRIP ||--|{ TRIP_MEMBER : "has members"
    TRIP ||--|{ ITINERARY_DAY : "contains days"
    TRIP ||--o{ EXPENSE : "tracks expenses"
    TRIP ||--o{ CHAT_MESSAGE : "has chat history"
    TRIP ||--o{ AI_REQUEST : "generates context for"

    USER {
        string id PK
        string email UK
        string name
        string avatar_url
        datetime created_at
    }

    TRIP {
        string id PK
        string title
        string destination
        date start_date
        date end_date
        float total_budget
        string currency
        string status
        datetime created_at
    }

    TRIP_MEMBER {
        string id PK
        string trip_id FK
        string user_id FK
        string role "creator | editor | viewer"
        json preferences "dietary, activity, pace"
        datetime joined_at
    }
```

## 2. Itinerary & Activities Model

```mermaid
erDiagram
    TRIP ||--|{ ITINERARY_DAY : "has schedule"
    ITINERARY_DAY ||--o{ ACTIVITY : "includes"
    ITINERARY_DAY ||--o{ ACCOMMODATION : "has night stay"

    ITINERARY_DAY {
        string id PK
        string trip_id FK
        int day_number "Day 1..N"
        date date
        string title
        string notes
    }

    ACTIVITY {
        string id PK
        string day_id FK
        string title
        string location
        time start_time
        time end_time
        float estimated_cost
        string category "adventure | food | culture | relaxation"
        string voting_status "proposed | confirmed"
    }

    ACCOMMODATION {
        string id PK
        string day_id FK
        string name
        string address
        float cost_per_night
    }
```

## 3. AI Service Telemetry & Chat Model

```mermaid
erDiagram
    TRIP ||--o{ AI_REQUEST : "associates"
    USER ||--o{ AI_REQUEST : "triggers"

    AI_REQUEST {
        string id PK
        string trip_id FK
        string user_id FK
        string feature "ai_chat | ai_itinerary"
        string prompt_version "chat.v1 | itinerary.v1"
        int prompt_tokens
        int completion_tokens
        int total_tokens
        int latency_ms
        string outcome "success | error"
        string error_message
        datetime created_at
    }

    CHAT_MESSAGE {
        string id PK
        string trip_id FK
        string user_id FK
        string role "user | assistant"
        text content
        boolean ai_generated
        json cited_context "days: [1, 3]"
        datetime created_at
    }
```
