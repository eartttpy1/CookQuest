const dns = require('dns');
dns.setServers([
  "8.8.8.8",
  "8.8.4.4",
]);

const mongoose = require('mongoose');
const Request = require('./serializer/request');
const Submission = require('./serializer/submission');

const mongoURI = 'mongodb+srv://CookQuestProject:3xmBT5S7w2Y054b0@cluster0.zz1bawk.mongodb.net/CookQuest?appName=Cluster0';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB connected');
  
  const submissions = await Submission.find().populate('requestId').limit(20);
  console.log('Submissions length:', submissions.length);
  submissions.forEach((sub, i) => {
    console.log(`\n--- Submission ${i} ---`);
    console.log('sub._id:', sub._id);
    console.log('sub.createdBy:', sub.createdBy);
    console.log('sub.requestId:', sub.requestId ? {
      _id: sub.requestId._id,
      menuName: sub.requestId.menuName,
      randomQuests: sub.requestId.randomQuests,
      createdBy: sub.requestId.createdBy
    } : null);
  });

  const requests = await Request.find().limit(20);
  console.log('\nRequests length:', requests.length);
  requests.forEach((req, i) => {
    console.log(`\n--- Request ${i} ---`);
    console.log('req._id:', req._id);
    console.log('req.menuName:', req.menuName);
    console.log('req.randomQuests:', req.randomQuests);
    console.log('req.createdBy:', req.createdBy);
  });

  mongoose.connection.close();
})
.catch(err => {
  console.error(err);
});
