
const axios = require('axios');

const BASE = process.env.PYTHON_AI_URL || 'http://127.0.0.1:5001/api';

async function callPythonAI(conversationId, prompt, skill = 'general') {
  const { data } = await axios.post(
    `${BASE}/chat`,
    {
      conversation_id: String(conversationId),
      prompt,
      skill
    },
    {
      timeout: Number(process.env.PYTHON_TIMEOUT_MS || 120000)
    }
  );

  if (data.errCode !== 0) {
    throw new Error(data.message || 'Python AI error');
  }

  return data.response;
}


// Gọi Python Brute Force Detector
async function callPythonThreat({
  window_minutes = 5,
  threshold = 5,
  limit = 1000
} = {}) {
  const { data } = await axios.get(
    `${BASE}/threats/brute-force`,
    {
      params: {
        window_minutes,
        threshold,
        limit
      },
      timeout: Number(process.env.PYTHON_TIMEOUT_MS || 120000)
    }
  );

  if (data.errCode !== 0) {
    throw new Error(data.message || 'Python Threat Detection error');
  }

  return data.data;
}


module.exports = {
  callPythonAI,
  callPythonThreat
};
