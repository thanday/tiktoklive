const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Question = require('./controllers/questionModel'); // Adjust the path if needed

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

    let currentOnAir = { question: "", answer: "" };

    // Display the question (and include its associated answer)
    socket.on('display-question', (data) => {
        currentOnAir.question = data.content;
        currentOnAir.answer = data.answer || "Waiting..."; // Default "Waiting..." if no answer is available
        io.emit('show-question', data); // Send question to output page
        io.emit('current-onair', currentOnAir); // Send both question and answer to control dashboard
    });

    // Display the answer
    socket.on('display-answer', (data) => {
        currentOnAir.answer = data.answer; // Update the answer
        io.emit('show-answer', data); // Send to output page
        io.emit('current-onair', currentOnAir); // Update the dashboard with the answer
    });

    // Clear the screen
    socket.on('clear-output', () => {
        currentOnAir = { question: "", answer: "" };
        io.emit('clear-screen'); // Clear output page
        io.emit('current-onair', currentOnAir); // Clear on-air display
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});







// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
