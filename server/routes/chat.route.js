
const router = require('express').Router();

const c = require('../controllers/chatController');

// Conversation APIs
router.get('/conversations', c.listConversations);
router.post('/conversations', c.createConversation);
router.put('/conversations/:id', c.renameConversation);
router.delete('/conversations/:id', c.deleteConversation);

// Message APIs
router.get('/messages/:conversation_id', c.getMessages);
router.post('/messages', c.saveMessage);

// Security monitoring APIs
router.get('/threats/brute-force', c.getBruteForce);

module.exports = router;
