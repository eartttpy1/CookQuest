const express = require("express");
const path = require("path"); // ✅ เพิ่มตรงนี้
const cors = require("cors"); // ✅ เพิ่มตรงนี้ (ถ้าจำเป็น)
const mongoose = require("mongoose");
const dns = require("dns");


const authRoutes = require("./routes/authRoutes");


const app = express();

// Middleware
app.use(cors()); // ✅ อนุญาตให้คนละ Port คุยกันได้
app.use(express.json());

// ใช้งาน Routes API
app.use("/api/auth", authRoutes); 

// Static Files - เข้าหน้าเว็บผ่าน http://localhost:5000
app.use(express.static(path.join(__dirname, "../html")));
app.use("/assets", express.static(path.join(__dirname, "../assets")));
app.use(express.static(path.join(__dirname, "../")));

// ตัวเลือกเสริม: ถ้าอยากให้เข้า localhost:5000/login แล้วเด้งไปหน้า login.html เลย
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "../html/user/login.html"));
});

// 🔥 fix DNS (สำหรับ Mongo Atlas)
dns.setServers(["8.8.8.8", "8.8.4.4"]);
mongoose.connect("mongodb+srv://CookQuestProject:3xmBT5S7w2Y054b0@cluster0.zz1bawk.mongodb.net/CookQuest?appName=Cluster0")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB error:", err));

app.listen(5000, () => {
    console.log("🚀 Server running on http://localhost:5000");
});