const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    delay
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const QRCode = require('qrcode');
const express = require('express');
const cors = require('cors');
const path = require('path');
const pino = require('pino');
require('dotenv').config();
const db = require('./database');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3001;
let sock;
let lastBroadcastTime = 0;
const COOLDOWN_MS = 5 * 60 * 1000;

// Middleware for API Key protection
const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.headers['x-admin-key'];
    if (process.env.API_AUTH_KEY && apiKey !== process.env.API_AUTH_KEY) {
        return res.status(401).json({ error: "Unauthorized: Invalid API Key" });
    }
    next();
};

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version, isLatest } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Windows', 'Chrome', '11.0.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr && !process.env.PHONE_NUMBER) {
            try {
                const qrPath = path.join(__dirname, 'qr.png');
                await QRCode.toFile(qrPath, qr);
                console.log('🔄 [QR Update] New code saved to qr.png');
            } catch (err) { console.error('❌ Failed to save QR file:', err); }
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('✅ Balaji WhatsApp Bot is Online!');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (!text) return;
        const from = msg.key.remoteJid;
        if (text.trim().toLowerCase() === '!ping') {
            await sock.sendMessage(from, { text: '🏓 Pong! Balaji Bot is Online.' });
        }
    });
}

function formatMessage(data) {
    return `📢 *NEW UPDATE: ${data.name}*
📝 *Post:* ${data.postName || 'N/A'}
🔢 *Vacancy:* ~${data.vacancy || 'Check Notification'} (Approx)

🗓️ *Last Date:* ${data.date || 'N/A'}
🎓 *Qualification:* ${data.qual || 'Check Notification'}

📞 *Contact us:* +91 9694969180
📍 *Visit: Balaji Computer & E-Mitra Center, Iskon Plaza (Old Cinema Hall), Sirohi*`;
}

// --- COMMAND CENTER API ENDPOINTS ---

// Get current queue and config
app.get("/api/admin/queue", authenticate, async (req, res) => {
    try {
        const queue = await db.getAllExams();
        const config = await db.getConfig();
        res.json({ queue, config });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Sync from Scraper (Next.js calls this)
app.post("/api/exams/push", authenticate, async (req, res) => {
    try {
        const exams = req.body.exams;
        console.log(`📥 [Bot] Received ${exams.length} exams from scraper.`);
        for (const exam of exams) {
            await db.addExam(exam);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Perform Action (Approve, Discard, Edit)
app.post("/api/admin/queue", authenticate, async (req, res) => {
    const { action, examId, updatedData } = req.body;
    try {
        if (action === 'approve') {
            const exams = await db.getAllExams();
            const exam = exams.find(e => e.id === examId);
            if (!exam) return res.status(404).json({ error: "Exam not found" });

            const formatted = {
                name: exam.name,
                postName: exam.post,
                vacancy: exam.vacancy,
                date: exam.endDate,
                qual: exam.qualification
            };

            const message = formatMessage(formatted);
            const target = process.env.COMMUNITY_CHANNEL_ID;
            await sock.sendMessage(target, { text: message });
            
            await db.updateExamStatus(examId, 'broadcasted', new Date().toISOString());
            console.log(`✅ [Manual] Broadcasted: ${exam.name}`);
        } else if (action === 'discard') {
            await db.deleteExam(examId);
        } else if (action === 'edit') {
            await db.updateExam(examId, updatedData);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Auto-Pilot Config
app.patch("/api/admin/queue", authenticate, async (req, res) => {
    const { autoPilot } = req.body;
    try {
        await db.setConfig(autoPilot);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Legacy Endpoint (keep for compatibility)
app.post("/api/send-update", authenticate, async (req, res) => {
    try {
        const message = formatMessage(req.body);
        await sock.sendMessage(process.env.COMMUNITY_CHANNEL_ID, { text: message });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

connectToWhatsApp();
app.listen(PORT, () => console.log(`🚀 Hybrid Bot API running on port ${PORT}`));
