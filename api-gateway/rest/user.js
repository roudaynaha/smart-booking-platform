const express = require('express');
const router = express.Router();
const { clients, grpcCall } = require('../grpc/client');

router.post('/', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const response = await grpcCall(clients.user, 'CreateUser', { name, email, password });
    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const response = await grpcCall(clients.user, 'GetUser', { id: req.params.id });
    res.json(response);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

module.exports = router;
