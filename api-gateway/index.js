const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const cors = require('cors');
const bodyParser = require('body-parser');

// REST routes
const userRoutes = require('./rest/user');
const catalogRoutes = require('./rest/catalog');
const bookingRoutes = require('./rest/booking');

// GraphQL schema and resolvers
const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');

async function startServer() {
  const app = express();
  
  app.use(cors());
  app.use(bodyParser.json());

  // REST API Endpoints
  app.use('/api/users', userRoutes);
  app.use('/api/catalog', catalogRoutes);
  app.use('/api/bookings', bookingRoutes);

  // GraphQL Apollo Server
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  app.get('/', (req, res) => {
    res.send('API Gateway is running. /api/* for REST, /graphql for GraphQL');
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
    console.log(`GraphQL endpoint available at http://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start API Gateway:', err);
});
