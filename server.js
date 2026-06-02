require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const dns = require("dns");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'cookquest_secret_key';
const nodemailer = require('nodemailer');

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

// Prevent API caching middleware
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.static('.'));

// Import models at the top
const Menu = require('./serializer/menu');
const Quest = require('./serializer/quest');
const Tag = require('./serializer/tag');
const Request = require('./serializer/request');
const Submission = require('./serializer/submission');
const Favorite = require('./serializer/favorite');
const UserMenu = require('./serializer/usermenu');
const User = require('./serializer/user');

function isBase64DataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:');
}

function toMenuListItem(menu) {
  if (!menu) return menu;
  if (isBase64DataUrl(menu.imageURL)) {
    return { ...menu, hasImage: true, imageURL: '' };
  }
  return menu;
}

function toRequestListItem(request) {
  if (!request) return request;
  if (isBase64DataUrl(request.imageURL)) {
    return { ...request, hasImage: true, imageURL: '' };
  }
  return request;
}
// MongoDB connection
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://CookQuestProject:3xmBT5S7w2Y054b0@cluster0.zz1bawk.mongodb.net/CookQuest?appName=Cluster0';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
})
.then(async () => {
  console.log('✓ MongoDB connected successfully');
  await Promise.all([
    Request.syncIndexes(),
    Submission.syncIndexes(),
    Favorite.syncIndexes(),
  ]);
  console.log('✓ Database indexes synced');

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Check server at http://localhost:${PORT}`);
  });
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
    user: process.env.EMAIL_USER || 'theripper754@gmail.com',
    pass: process.env.EMAIL_PASS || 'vbfjgtqzlbidhmhx'
  }
});

// Routes
app.post('/api/register', async (req, res) => {

  try {

    const { username, email, password } = req.body;

    // เช็ค user ซ้ำ (case-insensitive)
    const escapedUsername = String(username || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedEmail = String(email || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exist = await User.findOne({
      $or: [
        { username: { $regex: '^' + escapedUsername + '$', $options: 'i' } },
        { email: { $regex: '^' + escapedEmail + '$', $options: 'i' } }
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
      password: hashedPassword,
      level: 1,
      rank: 'BRONZE Chef',
      exp: 0
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
  const normalizedEmail = String(email || '').trim();
  const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const user = await User.findOne({
    email: { $regex: '^' + escapedEmail + '$', $options: 'i' }
  });
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

app.post('/api/forgot-password', async (req, res) => {
  try {
    const { identity } = req.body;
    const normalizedIdentity = String(identity || '').trim();

    if (!normalizedIdentity) {
      return res.status(400).json({ msg: 'Please provide username or email' });
    }

    const escapedIdentity = normalizedIdentity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({
      $or: [
        { email: { $regex: '^' + escapedIdentity + '$', $options: 'i' } },
        { username: { $regex: '^' + escapedIdentity + '$', $options: 'i' } }
      ]
    });

    // Do not expose whether account exists
    if (!user) {
      return res.json({ msg: 'If this account exists, we sent a reset OTP to the registered email.' });
    }

    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOtp = resetOtp;
    user.resetPasswordOtpExpire = Date.now() + (10 * 60 * 1000);
    await user.save();

    await transporter.sendMail({
      from: 'CookQuest',
      to: user.email,
      subject: 'CookQuest password reset OTP',
      text: `Your password reset OTP is ${resetOtp}. It expires in 10 minutes.`
    });

    return res.json({ msg: 'If this account exists, we sent a reset OTP to the registered email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ msg: 'Server error' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    const { identity, otp, newPassword } = req.body;
    const normalizedIdentity = String(identity || '').trim();
    const normalizedOtp = String(otp || '').trim();
    const password = String(newPassword || '');

    if (!normalizedIdentity || !normalizedOtp || !password) {
      return res.status(400).json({ msg: 'Identity, OTP and new password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ msg: 'New password must be at least 6 characters' });
    }

    const escapedIdentity = normalizedIdentity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({
      $or: [
        { email: { $regex: '^' + escapedIdentity + '$', $options: 'i' } },
        { username: { $regex: '^' + escapedIdentity + '$', $options: 'i' } }
      ]
    });

    if (!user || !user.resetPasswordOtp || !user.resetPasswordOtpExpire) {
      return res.status(400).json({ msg: 'Invalid reset request' });
    }

    if (user.resetPasswordOtp !== normalizedOtp) {
      return res.status(400).json({ msg: 'Invalid OTP' });
    }

    if (user.resetPasswordOtpExpire < Date.now()) {
      return res.status(400).json({ msg: 'OTP expired' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordOtp = null;
    user.resetPasswordOtpExpire = null;
    await user.save();

    return res.json({ msg: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ msg: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {

  try {

    const { username, password } = req.body;

    const normalizedUsername = String(username || '').trim();
    const escapedUsername = normalizedUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // หา user (case-insensitive & trim-robust)
    const user = await User.findOne({
      $or: [
        { username: { $regex: '^' + escapedUsername + '$', $options: 'i' } },
        { email: { $regex: '^' + escapedUsername + '$', $options: 'i' } }
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

async function addExpToProfile(req, res, expToAdd) {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const currentExp = Number(user.exp || 0);
    user.exp = currentExp + Number(expToAdd || 0);

    // Re-calculate Level and Rank
    const levelSystem = {
        1: { rank: 'BRONZE Chef', minXP: 0, maxXP: 1500 },
        2: { rank: 'SILVER Chef', minXP: 1501, maxXP: 3000 },
        3: { rank: 'GOLD Chef', minXP: 3001, maxXP: 5000 },
        4: { rank: 'PLATINUM Chef', minXP: 5001, maxXP: 8000 },
        5: { rank: 'DIAMOND Chef', minXP: 8001, maxXP: 12000 },
        6: { rank: 'MASTER Chef', minXP: 12001, maxXP: Infinity }
    };

    for (let level = 6; level >= 1; level--) {
        if (user.exp >= levelSystem[level].minXP) {
            user.level = level;
            user.rank = levelSystem[level].rank;
            break;
        }
    }

    await user.save();
    res.json({ msg: 'EXP & Level updated successfully', user });
  } catch (err) {
    console.error('Error updating EXP:', err);
    res.status(500).json({ msg: 'Server error' });
  }
}

app.post('/api/profile/add-exp', authMiddleware, async (req, res) => {
  return addExpToProfile(req, res, req.body.expToAdd);
});

app.post('/api/profile/add-badge', authMiddleware, async (req, res) => {
  try {
    const { badgeName, badgeIcon } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Initialize badges array if it doesn't exist
    if (!user.badges) {
      user.badges = [];
    }

    // Check if badge already exists
    const hasBadge = user.badges.some(b => b.name === badgeName);
    if (!hasBadge) {
      user.badges.push({ name: badgeName, icon: badgeIcon, earnedAt: new Date() });
      await user.save();
      return res.json({ msg: 'Badge added successfully', user });
    } else {
      return res.status(400).json({ msg: 'Badge already collected' });
    }
  } catch (err) {
    console.error('Error adding badge:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

app.get('/api/menus', async (req, res) => {
  try {
    const full = req.query.full === 'true';
    if (full) {
      const menus = await Menu.find().lean();
      return res.json(menus);
    }

    const menus = await Menu.aggregate(Menu.LIST_AGGREGATION);
    res.json(menus);
  } catch (error) {
    console.error('Error fetching menus:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/menus/images', async (req, res) => {
  try {
    const ids = String(req.query.ids || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return res.json({});
    }

    const menus = await Menu.find({ _id: { $in: ids } }).select('imageURL').lean();
    const images = {};
    menus.forEach((menu) => {
      images[String(menu._id)] = menu.imageURL || '';
    });
    res.json(images);
  } catch (error) {
    console.error('Error fetching menu images:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/menus/:id/image', async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id).select('imageURL').lean();
    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }
    res.json({ imageURL: menu.imageURL || '' });
  } catch (error) {
    console.error('Error fetching menu image:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/menus/:id', async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);
    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }
    res.json(menu);
  } catch (error) {
    console.error('Error fetching menu:', error.message);
    res.status(400).json({ error: error.message });
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

    // Also delete requests and submissions with this menuName
    const requestsToDelete = await Request.find({ menuName: menuName }).select('_id').lean();
    const reqIdsToDelete = requestsToDelete.map(r => r._id);
    await Submission.deleteMany({ requestId: { $in: reqIdsToDelete } });
    await Request.deleteMany({ _id: { $in: reqIdsToDelete } });

    // Also delete favorites pointing to this menu
    await Favorite.deleteMany({ menuId: req.params.id });

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
    const requests = await Request.find(query).select('-imageURL').sort({ _id: -1 }).lean();
    res.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/requests/:id/image', async (req, res) => {
  try {
    const request = await Request.findById(req.params.id).select('imageURL').lean();
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    res.json({ imageURL: request.imageURL || '' });
  } catch (error) {
    console.error('Error fetching request image:', error.message);
    res.status(400).json({ error: error.message });
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

    // Safely get the user ID (If Request schema lacks createdBy, fallback to Submission)
    const submission = await Submission.findOne({ requestId: request._id });
    const creatorId = request.createdBy || (submission ? submission.createdBy : null);

    // Give XP and increment completed recipes if approved
    if (normalizedStatus === 'approved' && creatorId) {
      // Fetch all required database items in parallel
      const [user, menu, questModel, userMenu, allQuests, allMenus, userSubmissions] = await Promise.all([
        User.findById(creatorId),
        Menu.findOne({ menuName: request.menuName }).select('EXP').lean(),
        Quest.findOne({ name: request.menuName }).select('exp').lean(),
        UserMenu.findOne({ menuName: request.menuName }).select('EXP').lean(),
        Quest.find().select('_id name exp tags').lean(),
        Menu.find().select('menuName questIds').lean(),
        Submission.find({ createdBy: creatorId, status: 'approved' })
          .select('requestId')
          .populate({ path: 'requestId', select: 'menuName' }).lean()
      ]);

      if (user) {
        let expReward = 100; // Default EXP fallback

        // Determine the EXP reward from parallel fetches
        if (menu && menu.EXP) {
          expReward = menu.EXP;
        } else if (questModel && questModel.exp) {
          expReward = questModel.exp;
        } else if (userMenu && userMenu.EXP) {
          expReward = userMenu.EXP;
        }

        const currentExp = Number(user.exp || 0);
        user.exp = currentExp + expReward;
        user.completedRecipes = (user.completedRecipes || 0) + 1;

        // Check Quest completion and award Quest EXP
        try {
          const approvedMenuNames = new Set();
          userSubmissions.forEach(sub => {
            if (sub.requestId && sub.requestId.menuName) {
              approvedMenuNames.add(sub.requestId.menuName.toLowerCase().trim());
            }
          });
          if (request.menuName) {
            approvedMenuNames.add(request.menuName.toLowerCase().trim());
          }
          
          for (const quest of allQuests) {
            const questIdStr = quest._id.toString();
            if (user.completedQuests && user.completedQuests.includes(questIdStr)) {
              continue;
            }
            
            const relatedMenus = allMenus.filter(m => {
              const hasQuestId = m.questIds && m.questIds.includes(questIdStr);
              const hasTagMatch = quest.tags && quest.tags.some(tag => tag.toLowerCase() === (m.menuName || '').toLowerCase());
              return hasQuestId || hasTagMatch;
            });
            
            if (relatedMenus.length > 0) {
              let questCompleted = true;
              for (const m of relatedMenus) {
                if (!approvedMenuNames.has((m.menuName || '').toLowerCase().trim())) {
                  questCompleted = false;
                  break;
                }
              }
              
              if (questCompleted) {
                const questExp = quest.exp || 0;
                user.exp = Number(user.exp || 0) + questExp;
                if (!user.completedQuests) {
                  user.completedQuests = [];
                }
                user.completedQuests.push(questIdStr);
                user.markModified('completedQuests');
                console.log(`User ${user.username} completed quest: ${quest.name}. Awarded ${questExp} EXP.`);
              }
            }
          }
        } catch (qErr) {
          console.error('Error checking quest completions:', qErr);
        }

        // Re-calculate Level and Rank
        const levelSystem = {
            1: { rank: 'BRONZE Chef', minXP: 0, maxXP: 1500 },
            2: { rank: 'SILVER Chef', minXP: 1501, maxXP: 3000 },
            3: { rank: 'GOLD Chef', minXP: 3001, maxXP: 5000 },
            4: { rank: 'PLATINUM Chef', minXP: 5001, maxXP: 8000 },
            5: { rank: 'DIAMOND Chef', minXP: 8001, maxXP: 12000 },
            6: { rank: 'MASTER Chef', minXP: 12001, maxXP: Infinity }
        };

        for (let level = 6; level >= 1; level--) {
            if (user.exp >= levelSystem[level].minXP) {
                user.level = level;
                user.rank = levelSystem[level].rank;
                break;
            }
        }

        // Check and award Milestone Badges directly to the database
        if (!Array.isArray(user.badges)) {
          user.badges = [];
        }
        const earnedBadges = user.badges.map((b) => b.name);
        if (user.completedRecipes >= 1 && !earnedBadges.includes('First Dish')) {
            user.badges.push({ name: 'First Dish', icon: '👨‍🍳' });
        }
        if (user.completedRecipes >= 5 && !earnedBadges.includes('5 Dishes')) {
            user.badges.push({ name: '5 Dishes', icon: '🔥' });
        }
        if (user.completedRecipes >= 10 && !earnedBadges.includes('10 Dishes')) {
            user.badges.push({ name: '10 Dishes', icon: '👑' });
        }

        await user.save();
      }
    }

    io.emit('status_updated', { requestId: request._id, status: normalizedStatus });

    res.json(request);
  } catch (error) {
    console.error('Error updating request status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/quests', async (req, res) => {
  try {
    const quests = await Quest.find().lean();
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
    const { menuName, randomQuests, imageURL, tasteRating, tasteTags, review, createdBy } = req.body;
    
    const request = new Request({
      menuName,
      randomQuests,
      imageURL,
      tasteRating,
      tasteTags,
      review,
      status: 'pending',
      submittedAt: new Date(),
      createdBy
    });
    await request.save();

    const submission = new Submission({
      requestId: request._id,
      imageURL,
      tasteRating,
      tasteTags,
      review,
      status: 'pending',
      createdBy
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

    // Also update the corresponding Request in database
    if (submission.requestId) {
      const request = await Request.findByIdAndUpdate(
        submission.requestId,
        { imageURL, tasteRating, tasteTags, review },
        { new: true }
      );
      
      // Emit socket event so that admin page reloads immediately
      io.emit('new_submission', { request, submission });
    }

    res.json(submission);
  } catch (error) {
    console.error('Error updating submission:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/submissions/:id', async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending submissions can be deleted' });
    }

    const requestId = submission.requestId;

    // Delete submission and request
    await Submission.findByIdAndDelete(req.params.id);
    if (requestId) {
      await Request.findByIdAndDelete(requestId);
    }

    // Emit socket event to notify other clients (e.g. admin page)
    io.emit('status_updated', { requestId: requestId, status: 'deleted' });

    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Error deleting submission:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const { requestId, menuName, userId, summary } = req.query;
    const query = {};
    if (requestId) query.requestId = requestId;
    if (userId) query.createdBy = userId;

    // Filter by menuName at database level rather than populating and filtering in memory
    if (menuName) {
      const reqQuery = { menuName };
      if (userId) reqQuery.createdBy = userId;
      const requests = await Request.find(reqQuery).select('_id').lean();
      const requestIds = requests.map(r => r._id);
      query.requestId = { $in: requestIds };
    }

    const useSummary = summary === 'true' || (userId && !menuName && !requestId);

    let historyQuery = Submission.find(query);
    if (useSummary) {
      historyQuery = historyQuery.select('-imageURL');
    }

    const history = await historyQuery
      .populate({
          path: 'requestId',
          select: 'menuName randomQuests status'
      })
      .sort({ _id: -1 });
      
    // Filter out submissions where requestId didn't match
    const filteredHistory = history.filter(sub => sub.requestId != null);

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
    const favorites = await Favorite.find({ userId }).select('userId menuId createdAt').lean();
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
    const menus = await UserMenu.find(filter).sort({ _id: -1 });
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