const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Question = require('./controllers/questionModel'); // Adjust the path if needed
const { WebcastPushConnection } = require('tiktok-live-connector');
const multer = require('multer');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const mongoose = require('mongoose');


// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/tiktokLive', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// Set up storage for multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });
const uploadedSponsorImages = []; // This array should persist all uploaded images

app.post('/upload-sponsor', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const sponsorImageUrl = `/uploads/${req.file.filename}`;
    uploadedSponsorImages.push({ url: sponsorImageUrl, filename: req.file.originalname });

    // Do not emit display-sponsor immediately
    res.json({ imageUrl: sponsorImageUrl });
});

app.get('/sponsor-images', (req, res) => {
    res.json(uploadedSponsorImages); // Return all uploaded images
});






const tiktokUsername = "sstvmv";

let isUserLive = false;

const tiktokLiveConnection = new WebcastPushConnection(tiktokUsername);


async function connectToTikTok() {
    try {
        const state = await tiktokLiveConnection.connect();
        console.info(`Connected to roomId ${state.roomId}`);
        isUserLive = true;
    } catch (error) {
        if (error instanceof Error && error.name === "InitialFetchError") {
            console.error("Connection error: User is likely offline.");
        } else {
            console.error("Connection error:", error);
        }
        isUserLive = false;
    }
}

// Attempt initial connection
connectToTikTok();

// Handle chat messages
tiktokLiveConnection.on('chat', (data) => {
    if (isUserLive) {
        io.emit('tiktok-chat', data);
    }
});

// Handle gifts
tiktokLiveConnection.on('gift', (data) => {
    if (isUserLive) {
        io.emit('tiktok-gift', data);
    }
});

// Handle errors or disconnection
tiktokLiveConnection.on('disconnected', () => {
    console.warn('Disconnected from TikTok live.');
    isUserLive = false;

    // Retry connection after a delay
    setTimeout(() => connectToTikTok(), 5000);
});

tiktokLiveConnection.on('error', (err) => {
    console.error('Connection error:', err);
    isUserLive = false;
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const questionRoutes = require('./routes/questionRoutes');
app.use('/questions', questionRoutes);

// Routes
app.get('/', (req, res) => {
    res.render('index', { message: 'Welcome to TikTok Live Production' });
});
app.get('/dashboard', (req, res) => {
    res.render('dashboard');
});
app.get('/output', (req, res) => {
    res.render('output');
});

app.get('/live-comments', (req, res) => {
    res.render('live-comments');
});

app.get('/test-questions', async (req, res) => {
    try {
        const questions = await Question.find();
        console.log('Fetched Questions:', questions);
        res.json(questions); // Return questions as JSON for testing
    } catch (error) {
        console.error('Error fetching questions in test:', error);
        res.status(500).send('Error fetching questions in test');
    }
});


app.get('/all-questions', async (req, res) => {
    try {
        const questions = await Question.find(); // Fetch all questions
        res.render('all-questions', { questions }); // Pass questions to EJS template
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).send('Error fetching questions');
    }
});

// Endpoint to get all uploaded sponsor images
app.get('/sponsor-images', (req, res) => {
    res.json(uploadedSponsorImages);
});


io.on('connection', (socket) => {
    console.log('A user connected');

    // Send current live status when a client connects
    if (!isUserLive) {
        socket.emit('not-live', { message: `The user ${tiktokUsername} is not currently live.` });
    }

    let currentOnAir = { questionId: "", question: "", answer: "" };

    socket.on('display-sponsor', (data) => {
        io.emit('display-sponsor', data); // Broadcast sponsor image to all clients
    });

    socket.on('clear-sponsor', () => {
        io.emit('clear-sponsor'); // Broadcast clear event to all clients
    });

    // Display the question
    socket.on('display-question', (data) => {
        currentOnAir = {
            questionId: data._id, // Use MongoDB's unique ID
            question: data.content,
            answer: 'Waiting...', // Default answer
        };

        // Emit the question and update all clients
        io.emit('show-question', data); // Send to output page
        io.emit('current-onair', currentOnAir); // Send to control dashboard and other pages
        console.log('On-Air Question Emitted:', currentOnAir);
    });

    // Display the answer
    socket.on('display-answer', (data) => {
        currentOnAir.answer = data.answer; // Update the answer

        // Emit the answer and update all clients
        io.emit('show-answer', data); // Send to output page
        io.emit('current-onair', currentOnAir); // Update control dashboard
        console.log('Answer Emitted:', currentOnAir);
    });

    // Clear the screen
    socket.on('clear-output', () => {
        currentOnAir = { questionId: "", question: "", answer: "" };

        // Emit clear events to all clients
        io.emit('clear-screen'); // Clear output page
        io.emit('current-onair', currentOnAir); // Clear on-air display
        console.log('Cleared On-Air Display');
    });



    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});



// Start the server css@adkhospital.com 3300246
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
