const express = require('express');
// const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB 연결 (비활성화)
/*
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB 연결 성공'))
.catch(err => console.error('MongoDB 연결 실패:', err));
*/

// 라우트 설정
// app.use('/api/door', require('./server/routes/door'));
app.use('/api/parking', require('./server/routes/parking'));
app.use('/api/customer', require('./server/routes/customer'));
app.use('/api/device', require('./server/routes/api'));

app.post('/api/tokens/validate', (req, res) => {
  res.json({ success: true, valid: true });
});

app.post('/api/control/:deviceId', (req, res) => {
  res.json({ success: true, message: '명령이 전송되었습니다.' });
});

// 서버 시작
app.listen(port, () => {
    console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
}); 