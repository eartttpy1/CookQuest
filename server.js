const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');

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

// Routes
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

app.delete('/api/menus/:id', async (req, res) => {
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

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Check server at http://localhost:${PORT}`);
});