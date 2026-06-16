# Architecture Globale

## Diagramme de l'Architecture

```
Client Web / Postman
        │
        ▼
┌─────────────────────────┐
│       API Gateway       │
│     (REST + GraphQL)    │
└───────────┬─────────────┘
            │ gRPC
            │
  ┌─────────┼─────────┬─────────┬─────────┐
  ▼         ▼         ▼         ▼         ▼
 User    Catalog   Booking   Payment   Notification
Service  Service   Service   Service     Service
(SQLite) (SQLite)  (SQLite)  (RxDB)      (RxDB)
  │         │         │         │         │
  └─────────┴─────────┴─────────┴─────────┘
                      │ Kafka
                      ▼
            ┌───────────────────┐
            │  Kafka Event Bus  │
            └───────────────────┘
```

## Choix Technologiques
- **API Gateway (Express + Apollo Server)** : Expose les endpoints REST et GraphQL. Transforme les appels REST/GraphQL en appels gRPC vers les microservices.
- **gRPC** : Choisi pour la communication synchrone rapide et typée entre l'API Gateway et les microservices, utilisant les fichiers `proto`.
- **Kafka** : Utilisé pour la communication asynchrone (event-driven). Permet le découplage des services (ex: lors de la création d'une réservation, le paiement est déclenché de manière asynchrone).
- **SQLite3** : Base de données relationnelle légère utilisée par les services User, Catalog et Booking.
- **RxDB** : Base de données orientée document (NoSQL) réactive utilisée par Payment et Notification, adaptée à la réception de flux d'événements (Kafka).

## Patrons d'Architecture
- **Database per Service** : Chaque microservice gère sa propre base de données.
- **API Gateway** : Un seul point d'entrée pour simplifier le front-end.
- **Event-Driven Architecture (Choreography)** : Utilisée pour le processus de paiement et de notification après une réservation.
