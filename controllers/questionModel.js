const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    content: { type: String, required: true },
    answer: { type: String, required: true },
    type: { type: String, enum: ['text', 'emoji'], default: 'text' }, // 'text' for normal questions, 'emoji' for emoji questions
    status: { type: String, default: 'pending' }
});

module.exports = mongoose.model('Question', questionSchema);
