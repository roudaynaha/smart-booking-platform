# Plateforme de Réservation Intelligente

Bienvenue dans le dépôt de la Plateforme de Réservation Intelligente. Ce projet implémente une architecture microservices moderne permettant aux utilisateurs de rechercher, réserver et payer des services variés (hôtels, salles, événements, etc.).

## Architecture Globale

L'application repose sur un ensemble de 5 microservices communiquant via **gRPC** et **Kafka**, orchestrés par une **API Gateway**.

- **API Gateway**: Point d'entrée (REST + GraphQL).
- **User Service**: Gestion des utilisateurs (SQLite3).
- **Catalog Service**: Gestion des offres et ressources (SQLite3).
- **Booking Service**: Gestion des réservations (SQLite3).
- **Payment Service**: Simulation des paiements (RxDB).
- **Notification Service**: Envoi de notifications (RxDB).

## Technologies Utilisées

- **Langage / Runtime**: JavaScript / Node.js
- **API Gateway / REST**: Express.js
- **GraphQL**: Apollo Server
- **Communication Interne**: gRPC & Protocol Buffers
- **Broker d'événements**: Kafka
- **Bases de données**: SQLite3 (SQL) & RxDB (NoSQL)
- **Conteneurisation**: Docker & Docker Compose

## Structure du Dépôt

- `api-gateway/` : Code de l'API Gateway.
- `services/` : Code source des 5 microservices.
- `proto/` : Définition des interfaces gRPC (`.proto`).
- `docker-compose.yml` : Fichier pour lancer l'infrastructure locale.
- `docs/` : Documentation détaillée du projet.

## Installation et Démarrage

### Prérequis
- Docker et Docker Compose
- Node.js LTS (pour exécution locale hors Docker)

### Démarrage avec Docker (Recommandé)

1. Clonez ce dépôt.
2. Démarrez les services avec Docker Compose :
   ```bash
   docker-compose up --build
   ```
3. L'API Gateway sera accessible sur les ports :
   - REST : `http://localhost:3000/api/*`
   - GraphQL : `http://localhost:3000/graphql`

## Documentation

La documentation détaillée est disponible dans le dossier `docs/` :
- [Architecture](./docs/architecture/README.md)
- [REST API](./docs/rest/README.md)
- [GraphQL API](./docs/graphql/README.md)
- [Kafka Topics](./docs/kafka/README.md)
- [Bases de données](./docs/database/README.md)

## Scénario Métier (Réservation complète)

1. L'utilisateur recherche une offre via `Catalog Service` (REST/GraphQL).
2. L'utilisateur crée une réservation via `Booking Service`.
3. Le statut de la réservation est `PENDING`.
4. `Booking Service` émet l'événement Kafka `booking.created`.
5. `Payment Service` consomme l'événement et simule le paiement.
6. `Payment Service` émet l'événement `payment.completed`.
7. `Notification Service` consomme cet événement et enregistre une notification.
