// console.log('Server đang khởi động...');

// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const path = require('path'); 
// require('dotenv').config();

// //  Khởi tạo app TRƯỚC khi dùng app.use
// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.static(path.join(__dirname, 'public')));

// // Routes
// const authRoutes = require('./src/routes/auth');
// app.use('/api/auth', authRoutes);

// app.use('/api/admin', require('./src/routes/admin'));
// app.use('/api/status', require('./src/routes/status'));
// app.use('/api/schedule', require('./src/routes/schedule'));

// // MongoDB
// mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => console.log('Kết nối MongoDB thành công'))
//   .catch(err => console.error('Lỗi kết nối MongoDB:', err));

// // Trang chính
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// app.get('/login.html', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'login.html'));
// });

// // Tự động điều khiển theo lịch
// const LightStatus = require('./src/models/LightStatus');
// const Schedule = require('./src/models/Schedule');

// setInterval(async () => {
//   const now = new Date();
//   const options = { hour: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' };
//   const currentTime = now.toTimeString('vi-VN', options).substring(0, 5); // "HH:mm"
//   const dayOfWeek = now.getDay();

//   const schedules = await Schedule.find();
//   let action = null;

//   for (let sched of schedules) {
//     const matchDay = sched.daysOfWeek.length === 0 || sched.daysOfWeek.includes(dayOfWeek);
//     if (!matchDay) continue;

//     if (sched.startTime <= currentTime && currentTime <= sched.endTime) {
//       action = sched.action;
//       break;
//     }
//     if (currentTime > sched.endTime) {
//       action = sched.action === 'on' ? 'off' : 'on';
//     }
//   }

//   if (action !== null) {
//     const shouldBeOn = (action === 'on');
//     const latest = await LightStatus.findOne().sort({ updatedAt: -1 });
//     if (!latest || latest.isOn !== shouldBeOn) {
//       const newStatus = new LightStatus({ isOn: shouldBeOn });
//       await newStatus.save();
//       console.log(`[Schedule] Đèn ${shouldBeOn ? 'BẬT' : 'TẮT'} lúc ${currentTime}`);
//     } else {
//       console.log(`[Schedule] Giữ nguyên trạng thái: ${shouldBeOn ? 'BẬT' : 'TẮT'} lúc ${currentTime}`);
//     }
//   } else {
//     console.log(`[Schedule] Không có lịch phù hợp lúc ${currentTime}`);
//   }
// }, 10000);

// // Chạy server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server đang chạy tại http://localhost:${PORT}`));


console.log('Server đang khởi động...');

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "script-src": ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
      "style-src": ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
      "img-src": ["'self'", "data:"],
    }
  }
})); // Bảo vệ HTTP Headers
const allowedOrigins = ['http://localhost:5000'];
app.use(cors({
  origin: function (origin, callback){
    if (!origin || allowedOrigins.includes(origin)){
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
// Tạo HTTP server cho Socket.IO
const http = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(http);
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET; // lấy từ .env

// Middleware xác thực token trước khi kết nối WebSocket
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication failed: No token'));
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    socket.user = decoded; // Gắn thông tin user vào socket
    next();
  } catch (err) {
    return next(new Error('Authentication failed: Invalid token'));
  }
});
// Middleware
app.use(express.json());
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Quá nhiều request từ IP này, vui lòng thử lại sau 15 phút.'
});
app.use('/api', apiLimiter);
app.use(express.static(path.join(__dirname, 'public')));

// Gắn Socket.IO vào app để dùng trong route
app.set('io', io);

// MongoDB connect
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('Kết nối MongoDB thành công'))
  .catch(err => console.error('Lỗi kết nối MongoDB:', err));

// Giao diện tĩnh
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.use((req, res, next) => {
  req.io = io;
  next();
});
// Routes API
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/status', require('./src/routes/status'));
app.use('/api/schedule', require('./src/routes/schedule'));

// WebSocket kết nối
io.on('connection', (socket) => {
  console.log('Client đã kết nối WebSocket');
});

// Tự động điều khiển theo lịch
const LightStatus = require('./src/models/LightStatus');
const Schedule = require('./src/models/Schedule');

setInterval(async () => {
  const now = new Date();
  const options = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' };
  const currentTime = now.toLocaleTimeString('vi-VN', options).substring(0, 5); // "HH:mm"
  const dayOfWeek = now.getDay();

  const schedules = await Schedule.find();
  let action = null;

  for (let sched of schedules) {
    const matchDay = sched.daysOfWeek.length === 0 || sched.daysOfWeek.includes(dayOfWeek);
    if (!matchDay) continue;

    if (sched.startTime <= currentTime && currentTime <= sched.endTime) {
      action = sched.action;
      break;
    }

    if (currentTime > sched.endTime) {
      action = sched.action === 'on' ? 'off' : 'on';
    }
  }

  if (action !== null) {
    const shouldBeOn = (action === 'on');
    const latest = await LightStatus.findOne().sort({ updatedAt: -1 });

    if (!latest || latest.isOn !== shouldBeOn) {
      const newStatus = new LightStatus({ isOn: shouldBeOn });
      await newStatus.save();

      console.log(`[Schedule] Đèn ${shouldBeOn ? 'BẬT' : 'TẮT'} lúc ${currentTime}`);

      // Gửi realtime tới tất cả client WebSocket
      io.emit('lightStatusUpdated', shouldBeOn);
    } else {
      console.log(`[Schedule] Giữ nguyên trạng thái: ${shouldBeOn ? 'BẬT' : 'TẮT'} lúc ${currentTime}`);
    }
  } else {
    console.log(`[Schedule] Không có lịch phù hợp lúc ${currentTime}`);
  }
}, 10000);

// Start server
const PORT = process.env.PORT || 5000;
http.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
