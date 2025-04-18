const mongoose = require('mongoose');

const accessTokenSchema = new mongoose.Schema({
    uniqueId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    token: {
        type: String,
        required: true
    },
    usageCount: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400  // 24시간 후 자동 삭제
    },
    lastUsed: {
        type: Date,
        default: null
    }
});

// 인덱스 생성
accessTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const AccessToken = mongoose.model('AccessToken', accessTokenSchema);

module.exports = AccessToken; 