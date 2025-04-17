const mongoose = require('mongoose');

const accessTokenSchema = new mongoose.Schema({
    uniqueId: {
        type: String,
        required: true,
        unique: true
    },
    token: {
        type: String,
        required: true
    },
    usageCount: {
        type: Number,
        default: 0,
        max: 10
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400  // 24시간 후 자동 삭제
    },
    lastUsed: {
        type: Date
    }
});

module.exports = mongoose.model('AccessToken', accessTokenSchema); 