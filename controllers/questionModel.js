const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    content: { type: String, required: true },
    answer: { type: String, required: true },
    emojiFilePath: { type: String, default: null }, // File path for emoji questions
    status: { type: String, default: 'pending' }
});

module.exports = mongoose.model('Question', questionSchema);
