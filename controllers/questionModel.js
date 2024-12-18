const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    content: { type: String, required: true }, // Question text
    answer: { type: String, required: true },  // Answer text
    status: { type: String, default: 'pending' }, // For future use
});

module.exports = mongoose.model('Question', questionSchema);
