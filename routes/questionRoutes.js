const express = require('express');
const router = express.Router();
const Question = require('../controllers/questionModel');

// Fetch all questions
router.get('/', async (req, res) => {
    const questions = await Question.find();
    res.json(questions);
});

router.post('/add', async (req, res) => {
    const { content, answer } = req.body; // Get question and answer
    try {
        const newQuestion = new Question({ content, answer });
        await newQuestion.save();
        res.redirect('/dashboard'); // Redirect back to the dashboard
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding question and answer');
    }
});

// Delete a question by ID
router.post('/delete/:id', async (req, res) => {
    try {
        await Question.findByIdAndDelete(req.params.id);
        res.redirect('/dashboard'); // Redirect back to dashboard
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting question');
    }
});


module.exports = router;
