const express = require('express');
const router = express.Router();
const { clients, grpcCall } = require('../grpc/client');

router.post('/', async (req, res) => {
  try {
    const { user_id, item_id, start_date, end_date } = req.body;
    const response = await grpcCall(clients.booking, 'CreateBooking', { user_id, item_id, start_date, end_date });
    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const response = await grpcCall(clients.booking, 'GetBooking', { id: req.params.id });
    res.json(response);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.get('/user/:user_id', async (req, res) => {
  try {
    const response = await grpcCall(clients.booking, 'GetUserBookings', { user_id: req.params.user_id });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const response = await grpcCall(clients.booking, 'CancelBooking', { id: req.params.id });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
