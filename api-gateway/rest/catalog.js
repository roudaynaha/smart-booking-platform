const express = require('express');
const router = express.Router();
const { clients, grpcCall } = require('../grpc/client');

router.get('/', async (req, res) => {
  try {
    const { query, type } = req.query;
    const response = await grpcCall(clients.catalog, 'SearchItems', { query: query || '', type: type || '' });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, type, price } = req.body;
    const response = await grpcCall(clients.catalog, 'CreateItem', { name, description, type, price });
    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const response = await grpcCall(clients.catalog, 'GetItem', { id: req.params.id });
    res.json(response);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

module.exports = router;
