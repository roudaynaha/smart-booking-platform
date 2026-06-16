const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    bookings: [Booking]
    notifications: [Notification]
  }

  type Item {
    id: ID!
    name: String!
    description: String!
    type: String!
    price: Float!
    available: Boolean!
  }

  type Booking {
    id: ID!
    user_id: String!
    item_id: String!
    start_date: String!
    end_date: String!
    status: String!
    item: Item
    payment: Payment
  }

  type Payment {
    id: ID!
    booking_id: String!
    amount: Float!
    status: String!
  }

  type Notification {
    id: ID!
    user_id: String!
    message: String!
    type: String!
  }

  type Query {
    user(id: ID!): User
    item(id: ID!): Item
    searchItems(query: String, type: String): [Item]
    booking(id: ID!): Booking
    userBookings(user_id: ID!): [Booking]
  }
`;

module.exports = typeDefs;
