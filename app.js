const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Question = require('./controllers/questionModel'); // Adjust the path if needed
const { WebcastPushConnection } = require('tiktok-live-connector');
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

//Tiktok connector API
const tiktokUsername = "sstvmv";
// Create a new connection
const tiktokLiveConnection = new WebcastPushConnection(tiktokUsername);

// Connect to the chat
tiktokLiveConnection.connect().then(state => {
    console.info(`Connected to roomId ${state.roomId}`);
}).catch(err => {
    console.error('Failed to connect', err);
});

// Handle chat messages
tiktokLiveConnection.on('chat', data => {
   // console.log(`${data.uniqueId} writes: ${data.comment}`);
    io.emit('tiktok-chat', data); // Emit chat messages to connected clients
});

// Handle gifts
tiktokLiveConnection.on('gift', data => {
    console.log(`${data.uniqueId} sends gift: ${data.giftName}`);
    io.emit('tiktok-gift', data); // Emit gift events to connected clients
});

// Handle connection errors
tiktokLiveConnection.on('error', err => {
    console.error('Connection error:', err);
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




io.on('connection', (socket) => {
    console.log('A user connected');

    let currentOnAir = { questionId: "", question: "", answer: "" };

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
