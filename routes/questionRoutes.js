const express = require('express');
const router = express.Router();
const Question = require('../controllers/questionModel');

// Fetch all questions
router.get('/', async (req, res) => {
    try {
        const questions = await Question.find();
        res.json(questions);
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).send('Error fetching questions');
    }
});

router.post('/add', async (req, res) => {
    try {
        const { content, answer, type } = req.body;
        const question = new Question({ content, answer, type });
        await question.save();
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Error adding question:', error);
        res.status(500).send('Error adding question');
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
