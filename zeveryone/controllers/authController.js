const User = require("../models/User");

// --- REGISTER LOGIC ---
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ msg: "User already exists" });

    const newUser = await User.create({ username, email, password });
    res.json({ msg: "Register success", user: newUser });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

// --- LOGIN LOGIC ---
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({
      $or: [{ username: username }, { email: username }]
    });

    if (!user || user.password !== password) {
      return res.status(400).json({ msg: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
    }

    res.json({ 
      msg: "Login success", 
      user: { id: user._id, username: user.username, email: user.email } 
    });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};