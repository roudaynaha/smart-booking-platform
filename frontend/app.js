const API_BASE = 'http://localhost:3001';

// ===== NAVIGATION =====
function switchSection(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  const el = document.getElementById(`section-${section}`);
  const nav = document.getElementById(`nav-${section}`);
  if (el) el.classList.add('active');
  if (nav) nav.classList.add('active');

  const titles = {
    dashboard: ['Dashboard', "Vue d'ensemble de la plateforme microservices"],
    users: ['Utilisateurs', 'Gestion des utilisateurs via REST → gRPC'],
    catalog: ['Catalogue', 'Gestion des articles via REST → gRPC'],
    bookings: ['Réservations', 'Gestion des réservations et Kafka events'],
    graphql: ['GraphQL', 'API GraphQL via Apollo Server'],
    architecture: ['Architecture', 'Vue technique de la plateforme SOA']
  };
  
  const [title, sub] = titles[section] || ['', ''];
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageSubtitle').textContent = sub;
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    switchSection(item.dataset.section);
  });
});

// ===== API HEALTH CHECK =====
async function checkHealth() {
  const dot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const badge = document.getElementById('gatewayBadge');
  const gatewayStatus = document.getElementById('gatewayStatus');

  try {
    const res = await fetch(`${API_BASE}/`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      dot.className = 'dot online';
      statusText.textContent = 'API Gateway Online';
      badge.className = 'stat-badge online';
      badge.textContent = 'Online';
      gatewayStatus.textContent = 'En ligne';
      addLog('success', `API Gateway accessible sur ${API_BASE}`);
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    dot.className = 'dot offline';
    statusText.textContent = 'Gateway Offline';
    badge.className = 'stat-badge offline';
    badge.textContent = 'Offline';
    gatewayStatus.textContent = 'Hors ligne';
    addLog('error', `Impossible de joindre ${API_BASE} — Lancez le projet avec Docker`);
  }
}

// ===== EVENT LOG =====
function addLog(type, msg) {
  const log = document.getElementById('eventLog');
  const now = new Date().toLocaleTimeString('fr');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<span class="log-time">${now}</span><span class="log-msg">${msg}</span>`;
  log.prepend(entry);
  if (log.children.length > 50) log.removeChild(log.lastChild);
}

// ===== TOAST =====
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => { t.className = 'toast'; }, 3500);
}

// ===== SHOW RESPONSE =====
function showResponse(panelId, statusId, bodyId, status, data) {
  const panel = document.getElementById(panelId);
  const statusEl = document.getElementById(statusId);
  const bodyEl = document.getElementById(bodyId);
  
  panel.style.display = 'block';
  statusEl.textContent = `HTTP ${status}`;
  statusEl.className = status >= 200 && status < 300 ? 'status-code ok' : 'status-code err';
  bodyEl.textContent = JSON.stringify(data, null, 2);
}

// ===== API CALL HELPER =====
async function apiCall(method, url, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  
  try {
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({ error: 'Invalid JSON response' }));
    return { status: res.status, data };
  } catch (err) {
    return { status: 0, data: { error: err.message + ' — Vérifiez que le projet tourne sur Docker' } };
  }
}

// ===== USERS =====
document.getElementById('createUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    name: document.getElementById('userName').value,
    email: document.getElementById('userEmail').value,
    password: document.getElementById('userPassword').value
  };
  
  addLog('info', `POST /api/users — Création de ${body.name}`);
  const { status, data } = await apiCall('POST', `${API_BASE}/api/users`, body);
  showResponse('userResponse', 'userResponseStatus', 'userResponseBody', status, data);
  
  if (status === 201) {
    showToast(`✅ Utilisateur "${data.name}" créé (ID: ${data.id})`, 'success');
    addLog('success', `Utilisateur créé — ID: ${data.id}, Kafka: user.created émis`);
    document.getElementById('createUserForm').reset();
  } else {
    showToast(`❌ Erreur: ${data.error || 'Création échouée'}`, 'error');
    addLog('error', `Erreur création utilisateur: ${data.error || status}`);
  }
});

async function getUser() {
  const id = document.getElementById('getUserId').value.trim();
  if (!id) return showToast('Entrez un ID utilisateur', 'error');
  
  addLog('info', `GET /api/users/${id}`);
  const { status, data } = await apiCall('GET', `${API_BASE}/api/users/${id}`);
  showResponse('userResponse', 'userResponseStatus', 'userResponseBody', status, data);
  
  if (status === 200) {
    addLog('success', `Utilisateur trouvé: ${data.name} (${data.email})`);
  } else {
    addLog('error', `Utilisateur introuvable: ${id}`);
  }
}

// ===== CATALOG =====
document.getElementById('createItemForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    name: document.getElementById('itemName').value,
    description: document.getElementById('itemDesc').value,
    type: document.getElementById('itemType').value,
    price: parseFloat(document.getElementById('itemPrice').value)
  };
  
  addLog('info', `POST /api/catalog — Création: ${body.name}`);
  const { status, data } = await apiCall('POST', `${API_BASE}/api/catalog`, body);
  showResponse('catalogResponse', 'catalogResponseStatus', 'catalogResponseBody', status, data);
  
  if (status === 201) {
    showToast(`✅ Article "${data.name}" créé — €${data.price}`, 'success');
    addLog('success', `Article créé — ID: ${data.id}, Type: ${data.type}`);
    document.getElementById('createItemForm').reset();
    searchItems();
  } else {
    showToast(`❌ Erreur: ${data.error || 'Création échouée'}`, 'error');
  }
});

async function searchItems() {
  const query = document.getElementById('searchQuery').value;
  const type = document.getElementById('searchType').value;
  
  addLog('info', `GET /api/catalog?query=${query}&type=${type}`);
  const { status, data } = await apiCall('GET', `${API_BASE}/api/catalog?query=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`);
  showResponse('catalogResponse', 'catalogResponseStatus', 'catalogResponseBody', status, data);
  
  const results = document.getElementById('catalogResults');
  if (status === 200 && data.items && data.items.length > 0) {
    results.innerHTML = data.items.map(item => `
      <div class="result-card" onclick="fillBookingItem('${item.id}')">
        <h4>${item.name}</h4>
        <p class="result-type">📦 ${item.type}</p>
        <p class="result-price">€${item.price}</p>
        <p class="result-id">${item.id}</p>
      </div>
    `).join('');
    addLog('success', `${data.items.length} article(s) trouvé(s)`);
  } else {
    results.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:10px">Aucun article trouvé</p>';
  }
}

function fillBookingItem(id) {
  document.getElementById('bookingItemId').value = id;
  switchSection('bookings');
  showToast(`📦 Article ${id} sélectionné pour réservation`, 'success');
}

// ===== BOOKINGS =====
document.getElementById('createBookingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    user_id: document.getElementById('bookingUserId').value,
    item_id: document.getElementById('bookingItemId').value,
    start_date: document.getElementById('bookingStart').value,
    end_date: document.getElementById('bookingEnd').value
  };
  
  addLog('info', `POST /api/bookings — user:${body.user_id} item:${body.item_id}`);
  const { status, data } = await apiCall('POST', `${API_BASE}/api/bookings`, body);
  showResponse('bookingResponse', 'bookingResponseStatus', 'bookingResponseBody', status, data);
  
  if (status === 201) {
    showToast(`✅ Réservation créée — ID: ${data.id}`, 'success');
    addLog('success', `Réservation créée — ID: ${data.id}, Statut: ${data.status}`);
    addLog('warn', `Kafka: booking.created émis → Payment Service déclenchera paiement automatique`);
    document.getElementById('createBookingForm').reset();
  } else {
    showToast(`❌ Erreur: ${data.error || 'Réservation échouée'}`, 'error');
    addLog('error', `Erreur réservation: ${data.error || status}`);
  }
});

async function getBooking() {
  const id = document.getElementById('bookingId').value.trim();
  if (!id) return showToast('Entrez un ID de réservation', 'error');
  
  addLog('info', `GET /api/bookings/${id}`);
  const { status, data } = await apiCall('GET', `${API_BASE}/api/bookings/${id}`);
  showResponse('bookingResponse', 'bookingResponseStatus', 'bookingResponseBody', status, data);
  if (status === 200) addLog('success', `Réservation ${id} — Statut: ${data.status}`);
}

async function cancelBooking() {
  const id = document.getElementById('bookingId').value.trim();
  if (!id) return showToast('Entrez un ID de réservation', 'error');
  
  addLog('warn', `POST /api/bookings/${id}/cancel — Annulation en cours`);
  const { status, data } = await apiCall('POST', `${API_BASE}/api/bookings/${id}/cancel`);
  showResponse('bookingResponse', 'bookingResponseStatus', 'bookingResponseBody', status, data);
  
  if (status === 200) {
    showToast(`🚫 Réservation ${id} annulée`, 'success');
    addLog('warn', `Réservation annulée — Kafka: booking.cancelled → Notification Service`);
  }
}

async function getUserBookings() {
  const userId = document.getElementById('bookingsByUser').value.trim();
  if (!userId) return showToast('Entrez un ID utilisateur', 'error');
  
  addLog('info', `GET /api/bookings/user/${userId}`);
  const { status, data } = await apiCall('GET', `${API_BASE}/api/bookings/user/${userId}`);
  showResponse('bookingResponse', 'bookingResponseStatus', 'bookingResponseBody', status, data);
  
  if (status === 200) {
    const count = data.bookings?.length || 0;
    addLog('success', `${count} réservation(s) pour l'utilisateur ${userId}`);
  }
}

// ===== GRAPHQL =====
const gqlQueries = {
  user: {
    query: `query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
  }
}`,
    vars: '{\n  "id": "YOUR_USER_ID"\n}'
  },
  search: {
    query: `query SearchItems($query: String, $type: String) {
  searchItems(query: $query, type: $type) {
    id
    name
    type
    price
    available
  }
}`,
    vars: '{\n  "query": "",\n  "type": "hotel"\n}'
  },
  bookings: {
    query: `query UserBookings($user_id: ID!) {
  userBookings(user_id: $user_id) {
    id
    status
    start_date
    end_date
  }
}`,
    vars: '{\n  "user_id": "YOUR_USER_ID"\n}'
  },
  fullUser: {
    query: `query FullUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    bookings {
      id
      status
      start_date
      end_date
      item {
        name
        price
        type
      }
      payment {
        amount
        status
      }
    }
    notifications {
      message
      type
    }
  }
}`,
    vars: '{\n  "id": "YOUR_USER_ID"\n}'
  }
};

function loadQuery(name) {
  const q = gqlQueries[name];
  if (!q) return;
  document.getElementById('gqlQuery').value = q.query;
  document.getElementById('gqlVariables').value = q.vars;
}

async function executeGraphQL() {
  const query = document.getElementById('gqlQuery').value.trim();
  const variablesRaw = document.getElementById('gqlVariables').value.trim();
  
  let variables = {};
  if (variablesRaw) {
    try { variables = JSON.parse(variablesRaw); }
    catch { document.getElementById('gqlResult').textContent = '// Erreur: Variables JSON invalides'; return; }
  }

  addLog('info', `GraphQL query vers ${API_BASE}/graphql`);
  document.getElementById('gqlResult').textContent = '// Exécution en cours...';

  try {
    const res = await fetch(`${API_BASE}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });
    const data = await res.json();
    document.getElementById('gqlResult').textContent = JSON.stringify(data, null, 2);
    
    if (data.errors) {
      addLog('error', `GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`);
    } else {
      addLog('success', 'Requête GraphQL exécutée avec succès');
    }
  } catch (err) {
    document.getElementById('gqlResult').textContent = `// Erreur: ${err.message}\n// Vérifiez que le projet tourne sur Docker`;
    addLog('error', `GraphQL error: ${err.message}`);
  }
}

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  // Set today's date as defaults
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  document.getElementById('bookingStart').value = today;
  document.getElementById('bookingEnd').value = tomorrow;
  
  addLog('info', 'Interface Smart Booking Platform chargée');
  checkHealth();
  setInterval(checkHealth, 30000);
});
