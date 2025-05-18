const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');
const { WebcastPushConnection } = require('tiktok-live-connector');
const Question = require('./controllers/questionModel');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/tiktokLive', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
mongoose.connection.once('open', () => {
    console.log('✅ Connected to MongoDB');
});

// Multer setup for sponsor image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });
const uploadedSponsorImages = [];

app.post('/upload-sponsor', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    const imageUrl = `/uploads/${req.file.filename}`;
    uploadedSponsorImages.push({ url: imageUrl, filename: req.file.originalname });
    res.json({ imageUrl });
});

app.get('/sponsor-images', (req, res) => res.json(uploadedSponsorImages));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => res.render('index'));
app.get('/dashboard', (req, res) => res.render('dashboard'));
app.get('/output', (req, res) => res.render('output'));
app.get('/myout', (req, res) => res.render('myout'));

app.get('/live-comments', (req, res) => res.render('live-comments'));
app.use('/questions', require('./routes/questionRoutes'));

app.get('/test-questions', async (req, res) => {
    try {
        const questions = await Question.find();
        res.json(questions);
    } catch (err) {
        console.error('Error fetching questions:', err);
        res.status(500).send('Error fetching questions');
    }
});

app.get('/all-questions', async (req, res) => {
    try {
        const questions = await Question.find();
        res.render('all-questions', { questions });
    } catch (err) {
        console.error('Error fetching questions:', err);
        res.status(500).send('Error fetching questions');
    }
});

// TikTok Live Setup
const tiktokUsername = 'fayaa1987';
let isUserLive = false;
const tiktokLiveConnection = new WebcastPushConnection(tiktokUsername);

async function connectToTikTok() {
    try {
        const state = await tiktokLiveConnection.connect();
        console.info(`🎥 Connected to TikTok roomId: ${state.roomId}`);
        isUserLive = true;
    } catch (error) {
        console.error('❌ TikTok Connection Error:', error);
        isUserLive = false;
        setTimeout(connectToTikTok, 15000); // Retry in 15s
    }
}
connectToTikTok();

// TikTok Events
tiktokLiveConnection.on('chat', (data) => {
    if (isUserLive) io.emit('tiktok-chat', data);
});

tiktokLiveConnection.on('gift', (data) => {
    if (isUserLive) io.emit('tiktok-gift', data);
});

tiktokLiveConnection.on('disconnected', () => {
    console.warn('📴 Disconnected from TikTok');
    isUserLive = false;
    tiktokLiveConnection.disconnect();
    setTimeout(connectToTikTok, 5000);

});

tiktokLiveConnection.on('error', (err) => {
    console.error('⚠️ TikTok Error:', err);
    isUserLive = false;
    tiktokLiveConnection.disconnect();
    setTimeout(connectToTikTok, 5000);

});

// WebSocket Logic
io.on('connection', (socket) => {
    console.log('🌐 Client connected');

    if (!isUserLive) {
        socket.emit('not-live', { message: `The user ${tiktokUsername} is not currently live.` });
    }

    let currentOnAir = { questionId: '', question: '', answer: '' };

    socket.on('display-sponsor', (data) => {
        io.emit('display-sponsor', data);
    });

    socket.on('clear-sponsor', () => {
        io.emit('clear-sponsor');
    });

    socket.on('display-question', (data) => {
        currentOnAir = {
            questionId: data._id,
            question: data.content,
            answer: 'Waiting...',
        };

        if (data.type === 'emoji') {
            data.emojis = data.content.split(' ');
        }

        io.emit('show-question', data);
        io.emit('current-onair', currentOnAir);
        console.log('📺 On-Air Question:', currentOnAir);
    });

    socket.on('display-answer', (data) => {
        currentOnAir.answer = data.answer;
        io.emit('show-answer', data);
        io.emit('current-onair', currentOnAir);
        console.log('✅ Answer Shown:', currentOnAir);
    });

    socket.on('clear-output', () => {
        currentOnAir = { questionId: '', question: '', answer: '' };
        io.emit('clear-screen');
        io.emit('current-onair', currentOnAir);
        console.log('🧹 Cleared On-Air Display');
    });

    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected');
    });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
