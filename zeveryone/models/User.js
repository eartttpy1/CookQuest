const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// ตรวจสอบว่ามี Model นี้อยู่หรือยัง ถ้าไม่มีให้สร้างใหม่
module.exports = mongoose.models.User || mongoose.model("User", userSchema);