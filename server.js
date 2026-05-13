const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const dns = require("dns");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'cookquest_secret_key';
const nodemailer = require('nodemailer');
require('dotenv').config();

// ผมไม่สามารถเข้าปกติได้ ต้องset dns ไว้
dns.setServers([
  "8.8.8.8",
  "8.8.4.4",
]);

const app = express();
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('.'));

// Import models at the top
const Menu = require('./serializer/menu');
const Quest = require('./serializer/quest');
const Tag = require('./serializer/tag');
const Request = require('./serializer/request');
const Submission = require('./serializer/submission');
const Favorite = require('./serializer/favorite');
const UserMenu = require('./serializer/usermenu');
// MongoDB connection
const mongoURI = 'mongodb+srv://CookQuestProject:3xmBT5S7w2Y054b0@cluster0.zz1bawk.mongodb.net/CookQuest?appName=Cluster0';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✓ MongoDB connected successfully');
})
.catch(err => {
  console.error('✗ MongoDB connection error:', err.message);
  console.error('Connection string:', mongoURI);
  process.exit(1);
});

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('✗ MongoDB error:', err.message);
});

//OTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Routes
app.post('/api/register', async (req, res) => {

  try {

    const { username, email, password } = req.body;

    // เช็ค user ซ้ำ
    const exist = await User.findOne({
      $or: [
        { username },
        { email }
      ]
    });

    if (exist) {
      return res.status(400).json({
        msg: 'User already exists'
      });
    }

    // HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    // CREATE USER
    const user = await User.create({
      username,
      email,
      password: hashedPassword
    });
    
    //OTP

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

      user.otp = otp;
      user.otpExpire = Date.now() + 5 * 60 * 1000;

      await user.save();
 
      await transporter.sendMail({
        from: 'CookQuest',
        to: user.email,
        subject: 'Your OTP Code',
        text: `Your OTP is ${otp}`
     });

    res.json({
      msg: 'Register success',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      msg: 'Server error'
    });

  }

});

app.post('/api/verify-otp', async (req, res) => {
  console.log("BODY:", req.body);

  const { email, otp } = req.body;

  const user = await User.findOne({ email });
    console.log("email:", email);
    console.log("otp:", otp);

  if (!user) {
    return res.status(404).json({
      msg: 'User not found'
    });
  }

  if (user.otp !== otp) {
    return res.status(400).json({
      msg: 'OTP incorrect'
    });
  }

  if (user.otpExpire < Date.now()) {
    return res.status(400).json({
      msg: 'OTP expired'
    });
  }

  user.isVerified = true;

  user.otp = null;
  user.otpExpire = null;

  await user.save();

  res.json({
    msg: 'Verify success'
  });

});

app.post('/api/login', async (req, res) => {

  try {

    const { username, password } = req.body;

    // หา user
    const user = await User.findOne({
      $or: [
        { username },
        { email: username }
      ]
    });

    if (!user) {
      return res.status(400).json({
        msg: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      });
    }

    // เช็ครหัสผ่าน
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        msg: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      });
    }

   if (!user.isVerified) {
      return res.status(400).json({
        msg: 'Please verify OTP first',
        needsOtp: true,  // เพิ่ม flag เพื่อบอก front-end
        email: user.email // ส่ง email กลับไปเพื่อใช้ในหน้า verify-otp
      });
}

    // สร้าง TOKEN
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      {
        expiresIn: '7d'
      }
    );

    res.json({
      msg: 'Login success',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      msg: 'Server error'
    });

  }

});


const authMiddleware = (req, res, next) => {

  try {

    const authHeader = req.headers.authorization;

    if (!authHeader) {

      return res.status(401).json({
        msg: 'No token'
      });

    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    req.user = decoded;

    next();

  } catch (err) {

    return res.status(401).json({
      msg: 'Invalid token'
    });

  }

};

const adminMiddleware = (req, res, next) => {

  if (req.user.role !== 'admin') {

    return res.status(403).json({
      msg: 'Admin only'
    });

  }

  next();

};

app.get('/api/profile', authMiddleware, async (req, res) => {

  try {

    const user = await User.findById(req.user.id)
      .select('-password');

    if (!user) {

      return res.status(404).json({
        msg: 'User not found'
      });

    }

    res.json(user);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      msg: 'Server error'
    });

  }

});

app.get('/api/menus', async (req, res) => {
  try {
    const menus = await Menu.find();
    res.json(menus);
  } catch (error) {
    console.error('Error fetching menus:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/menus', async (req, res) => {
  try {
    const menu = new Menu(req.body);
    await menu.save();
    res.status(201).json(menu);
  } catch (error) {
    console.error('Error creating menu:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/menus/:id', async (req, res) => {
  try {
    const menu = await Menu.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }
    res.json(menu);
  } catch (error) {
    console.error('Error updating menu:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/menus/:id', authMiddleware, adminMiddleware,async (req, res) => {
  try {
    const menu = await Menu.findByIdAndDelete(req.params.id);
    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const menuName = (menu.menuName || '').trim();
    const escapedName = menuName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const questQuery = {
      tags: { $elemMatch: { $regex: `^${escapedName}$`, $options: 'i' } }
    };

    const affectedQuests = await Quest.find(questQuery);
    const updatedQuestNames = [];
    const deletedQuestNames = [];

    for (const quest of affectedQuests) {
      const filteredTags = (quest.tags || [])
        .map(tag => (typeof tag === 'string' ? tag.trim() : tag))
        .filter(tag => tag && tag.toLowerCase() !== menuName.toLowerCase());

      if (filteredTags.length === 0) {
        await Quest.findByIdAndDelete(quest._id);
        deletedQuestNames.push(quest.name);
      } else {
        quest.tags = filteredTags;
        await quest.save();
        updatedQuestNames.push(quest.name);
      }
    }

    res.json({
      message: 'Menu deleted successfully',
      menuName,
      affectedQuests: updatedQuestNames,
      deletedQuests: deletedQuestNames
    });
  } catch (error) {
    console.error('Error deleting menu:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tags', async (req, res) => {
  try {
    const search = req.query.search || '';
    const query = search ? { name: { $regex: search, $options: 'i' } } : {};
    const tags = await Tag.find(query).sort({ name: 1 }).limit(50);
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tags', async (req, res) => {
  try {
    const names = Array.isArray(req.body.name) ? req.body.name : [req.body.name];
    const createdTags = [];

    for (const name of names) {
      if (!name || typeof name !== 'string') continue;
      const trimmed = name.trim();
      if (!trimmed) continue;
      const tag = await Tag.findOneAndUpdate(
        { name: trimmed },
        { name: trimmed },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      createdTags.push(tag);
    }

    res.status(201).json(createdTags.length === 1 ? createdTags[0] : createdTags);
  } catch (error) {
    console.error('Error creating tag:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/requests', async (req, res) => {
  try {
    const status = (req.query.status || 'all').toLowerCase();
    const allowedStatuses = ['all', 'pending', 'approved', 'rejected'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }

    const query = status === 'all' ? {} : { status };
    const requests = await Request.find(query).sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/requests/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const normalizedStatus = String(status || '').trim().toLowerCase();
    const allowedStatuses = ['approved', 'rejected'];

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({ error: 'Invalid status update' });
    }

    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status && request.status !== 'pending') {
      return res.status(400).json({ error: 'Status cannot be changed after decision' });
    }

    request.status = normalizedStatus;
    await request.save();

    // Update the corresponding submission status
    await Submission.updateMany(
      { requestId: request._id },
      { $set: { status: normalizedStatus } }
    );

    io.emit('status_updated', { requestId: request._id, status: normalizedStatus });

    res.json(request);
  } catch (error) {
    console.error('Error updating request status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/quests', async (req, res) => {
  try {
    const quests = await Quest.find();
    res.json(quests);
  } catch (error) {
    console.error('Error fetching quests:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/quests', async (req, res) => {
  try {
    const quest = new Quest(req.body);
    await quest.save();
    res.status(201).json(quest);
  } catch (error) {
    console.error('Error creating quest:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/quests/:id', async (req, res) => {
  try {
    const quest = await Quest.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }
    res.json(quest);
  } catch (error) {
    console.error('Error updating quest:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/quests/:id', async (req, res) => {
  try {
    const quest = await Quest.findByIdAndDelete(req.params.id);
    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }
    res.json({ message: 'Quest deleted successfully' });
  } catch (error) {
    console.error('Error deleting quest:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/submissions', async (req, res) => {
  try {
    const { menuName, randomQuests, imageURL, tasteRating, tasteTags, review } = req.body;
    
    const request = new Request({
      menuName,
      randomQuests,
      imageURL,
      tasteRating,
      tasteTags,
      review,
      status: 'pending',
      submittedAt: new Date()
    });
    await request.save();

    const submission = new Submission({
      requestId: request._id,
      imageURL,
      tasteRating,
      tasteTags,
      review,
      status: 'pending'
    });
    await submission.save();

    io.emit('new_submission', { request, submission });

    res.status(201).json({ request, submission });
  } catch (error) {
    console.error('Error creating submission:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/submissions/:id', async (req, res) => {
  try {
    const { imageURL, tasteRating, tasteTags, review } = req.body;
    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { imageURL, tasteRating, tasteTags, review, editedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    res.json(submission);
  } catch (error) {
    console.error('Error updating submission:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const { requestId, menuName } = req.query;
    const query = requestId ? { requestId } : {};
    
    let matchQuery = {};
    if (menuName) {
        matchQuery.menuName = menuName;
    }
    
    const history = await Submission.find(query)
      .populate({
          path: 'requestId',
          select: 'menuName randomQuests status',
          match: matchQuery
      })
      .sort({ submittedAt: -1 });
      
    // Filter out submissions where requestId didn't match (if we filtered by menuName)
    const filteredHistory = menuName ? history.filter(sub => sub.requestId != null) : history;
      
    res.json(filteredHistory);
  } catch (error) {
    console.error('Error fetching history:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/favorites/toggle', async (req, res) => {
  try {
    const { userId, menuId } = req.body;
    if (!userId || !menuId) {
      return res.status(400).json({ error: 'Missing userId or menuId' });
    }

    const existing = await Favorite.findOne({ userId, menuId });
    if (existing) {
      await Favorite.findByIdAndDelete(existing._id);
      return res.json({ status: 'unfavorited', menuId });
    } else {
      const fav = new Favorite({ userId, menuId });
      await fav.save();
      return res.status(201).json({ status: 'favorited', menuId });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/favorites', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    const favorites = await Favorite.find({ userId });
    res.json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// UserMenu API Endpoints (Custom Recipes)
// ==========================================

app.get('/api/usermenus', async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { createdBy: userId } : {};
    const menus = await UserMenu.find(filter).sort({ createdAt: -1 });
    res.json(menus);
  } catch (error) {
    console.error('Error fetching usermenus:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/usermenus', async (req, res) => {
  try {
    const menu = new UserMenu(req.body);
    await menu.save();
    res.status(201).json(menu);
  } catch (error) {
    console.error('Error creating usermenu:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/usermenus/:id', async (req, res) => {
  try {
    const menu = await UserMenu.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!menu) {
      return res.status(404).json({ error: 'UserMenu not found' });
    }
    res.json(menu);
  } catch (error) {
    console.error('Error updating usermenu:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/usermenus/:id', async (req, res) => {
  try {
    const menu = await UserMenu.findByIdAndDelete(req.params.id);
    if (!menu) {
      return res.status(404).json({ error: 'UserMenu not found' });
    }
    res.json({ message: 'UserMenu deleted successfully' });
  } catch (error) {
    console.error('Error deleting usermenu:', error.message);
    res.status(500).json({ error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Check server at http://localhost:${PORT}`);
});