const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// MongoDB connection
const mongoURI = 'mongodb+srv://CookQuestProject:3xmBT5S7w2Y054b0@cluster0.zz1bawk.mongodb.net/CookQuest?appName=Cluster0';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.get('/api/menus', async (req, res) => {
  try {
    const Menu = require('./serializer/menu');
    const menus = await Menu.find();
    res.json(menus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/menus', async (req, res) => {
  try {
    const Menu = require('./serializer/menu');
    const menu = new Menu(req.body);
    await menu.save();
    res.status(201).json(menu);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/menus/:id', async (req, res) => {
  try {
    const Menu = require('./serializer/menu');
    const menu = await Menu.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }
    res.json(menu);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/menus/:id', async (req, res) => {
  try {
    const Menu = require('./serializer/menu');
    const menu = await Menu.findByIdAndDelete(req.params.id);
    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }
    res.json({ message: 'Menu deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/quests', async (req, res) => {
  try {
    const Quest = require('./serializer/quest');
    const quests = await Quest.find();
    res.json(quests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/quests', async (req, res) => {
  try {
    const Quest = require('./serializer/quest');
    const quest = new Quest(req.body);
    await quest.save();
    res.status(201).json(quest);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/quests/:id', async (req, res) => {
  try {
    const Quest = require('./serializer/quest');
    const quest = await Quest.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }
    res.json(quest);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/quests/:id', async (req, res) => {
  try {
    const Quest = require('./serializer/quest');
    const quest = await Quest.findByIdAndDelete(req.params.id);
    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }
    res.json({ message: 'Quest deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});