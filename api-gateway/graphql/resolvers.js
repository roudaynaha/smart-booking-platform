const { clients, grpcCall } = require('../grpc/client');

const resolvers = {
  Query: {
    user: async (_, { id }) => {
      return await grpcCall(clients.user, 'GetUser', { id });
    },
    item: async (_, { id }) => {
      return await grpcCall(clients.catalog, 'GetItem', { id });
    },
    searchItems: async (_, { query, type }) => {
      const response = await grpcCall(clients.catalog, 'SearchItems', { query: query || '', type: type || '' });
      return response.items;
    },
    booking: async (_, { id }) => {
      return await grpcCall(clients.booking, 'GetBooking', { id });
    },
    userBookings: async (_, { user_id }) => {
      const response = await grpcCall(clients.booking, 'GetUserBookings', { user_id });
      return response.bookings;
    }
  },
  User: {
    bookings: async (user) => {
      const response = await grpcCall(clients.booking, 'GetUserBookings', { user_id: user.id });
      return response.bookings || [];
    },
    notifications: async (user) => {
      const response = await grpcCall(clients.notification, 'GetNotifications', { user_id: user.id });
      return response.notifications || [];
    }
  },
  Booking: {
    item: async (booking) => {
      return await grpcCall(clients.catalog, 'GetItem', { id: booking.item_id });
    },
    payment: async (booking) => {
      try {
        return await grpcCall(clients.payment, 'GetPayment', { booking_id: booking.id });
      } catch (err) {
        return null;
      }
    }
  }
};

module.exports = resolvers;
