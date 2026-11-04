BACKEND V1 - SETUP

Merge server/ and python/ into ~/Wazuh-AI-Assistant. Copy .env.example to
~/Wazuh-AI-Assistant/.env and set the password locally. Never commit .env.

Node:
  cd ~/Wazuh-AI-Assistant/server
  npm install
  node server.js

Python (run in a second terminal):
  cd ~/Wazuh-AI-Assistant
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r python/requirements.txt
  cd python
  ../.venv/bin/uvicorn server:app --host 127.0.0.1 --port 5001

The existing frontend endpoints are preserved:
GET/POST /api/conversations
PUT/DELETE /api/conversations/:id
GET /api/messages/:conversation_id
POST /api/messages

Initial alert search: wazuh-alerts-4.x, last 24 hours, up to 15 hits.
Verify the actual index pattern and model inference before relying on this.
The prompt-style connector is invoked with parameters.prompt. This must be
verified against the existing deployed model/connector. Restrict CORS and use
valid TLS verification before production.
