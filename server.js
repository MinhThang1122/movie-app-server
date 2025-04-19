const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
app.use('/images', express.static('public/images'));
app.use(express.static(path.join(__dirname, "public")));

const JWT_SECRET = "supersecret123"; 

const MONGO_URI = "mongodb+srv://dbMovie:15122003a@movie-app.ogu6ufw.mongodb.net/movie-app?retryWrites=true&w=majority&appName=movie-app";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Kết nối MongoDB thành công!"))
  .catch((err) => console.error("Lỗi kết nối MongoDB:", err));
  
// Cấu hình multer để lưu ảnh vào thư mục public/images
const storage = multer.diskStorage({
  destination: "public/images/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

const movieSchema = new mongoose.Schema({
  id: String,
  name: String,
  category: String,
  date: String,
  description: String,
  image: String,
});
const Movie = mongoose.model("Movie", movieSchema, "movie");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model("User", userSchema, "user");

app.put("/movies-update/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, date, description } = req.body;
    let imagePath = req.body.image; // Nếu không upload ảnh mới, giữ ảnh cũ

    if (req.file) {
      imagePath = `/images/${req.file.filename}`;
    }

    const updatedMovie = await Movie.findByIdAndUpdate(
      id,
      { name, category, date, description, image: imagePath },
      { new: true }
    );

    if (!updatedMovie) {
      return res.status(404).json({ message: "Không tìm thấy phim!" });
    }

    res.status(200).json(updatedMovie);
  } catch (error) {
    console.error("Lỗi khi cập nhật phim:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

app.get("/movies", async (req, res) => {
  try {
    const movies = await Movie.find();
    res.status(200).json(movies);
  } catch (error) {
    console.error("Lỗi khi fetch movies:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  } 
});
 
app.post("/movies-add", upload.single("image"), async (req, res) => {
  try {
    const { id, name, category, date, description } = req.body;

    let imagePath = "";
    if (req.file) {
      imagePath = `/images/${req.file.filename}`;
    }

    const newMovie = new Movie({
      id,
      name,
      category,
      date,
      description,
      image: imagePath,
    });

    await newMovie.save();

    res.status(201).json(newMovie);
  } catch (error) {
    console.error("Lỗi khi thêm phim:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

app.delete("/movies-delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMovie = await Movie.findByIdAndDelete(id);
    if (!deletedMovie) {
      return res.status(404).json({ message: "Không tìm thấy phim!" });
    }
    res.status(200).json({ message: "Xóa phim thành công!" });
  } catch (error) {
    console.error("Lỗi khi xóa phim:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Tên người dùng đã tồn tại" });
    }

    const hashedPassword = await bcrypt.hash(password, 10); // mã hóa password
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "Đăng ký thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Sai tài khoản hoặc mật khẩu" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Sai tài khoản hoặc mật khẩu" });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token, message: "Đăng nhập thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

app.listen(port, () => console.log(`Server đang chạy tại http://localhost:${port}`));
