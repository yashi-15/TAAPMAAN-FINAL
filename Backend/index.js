const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Razorpay = require("razorpay");
require('dotenv').config();
const cors = require('cors');


const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const allowedOrigins = ["http://148.135.136.178", "https://148.135.136.178", "http://taapmaan.live", "https://taapmaan.live"];
// Allow requests from your frontend
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST"],
  credentials: true,
}));
// app.use(cors());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('Error connecting to MongoDB Atlas:', err));

// Define User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

// Define a schema for payment details
const paymentSchema = new mongoose.Schema({
  paymentId: String,
  orderId: String,
  status: String,
  upiId: String,
  user: {
      name: String,
      email: String,
      phone: String,
  },
  amount: Number,
  createdAt: { type: Date, default: Date.now },
});

// Create a model
const Payment = mongoose.model("Payment", paymentSchema);

// Razorpay instance
const razorpay = new Razorpay({
  key_id: "rzp_live_BSOxL08MrkmXlw",
  key_secret: "4CfR5zLwfn1G7CUwYRS1yds1",
});

// Routes
app.get("/", (req, res) => {
  res.send("Backend is up!");
});

app.get('/api/get-google-api-key', (req, res) => {
  res.json({ apiKey: process.env.GOOGLE_API_KEY });
});


// Registration Route with Validation and Password Hashing
app.post("/signup", async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const emailString = email.toString();

    const existingUser = await User.findOne({ email: emailString });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email: emailString, phone, password: hashedPassword });
    await newUser.save();

    console.log("Registered");
    res.json({ success: true, message: "Registration successful" });
  } catch (error) {  
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login Route with Password Validation
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log("User logged in successfully");
    res.json({ 
      success: true, 
      message: "Login successful",
      user: { name: user.name, phone: user.phone, email: user.email }
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Error logging in. Please try again later." });
  }
});

// Route to create an order
app.post("/createOrder", async (req, res) => {
  try {
      const { amount } = req.body;
      console.log(`Creating order for amount: ${amount}`);
      const options = {
          amount: amount * 100, // Convert amount to paise
          currency: "INR",
          receipt: `receipt_${Date.now()}`,
      };
      const order = await razorpay.orders.create(options);
      console.log("Order created successfully:", order);
      res.json({ success: true, order });
  } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ success: false, message: "Something went wrong!" });
  }
});

// Route to update payment status
app.post("/updatePaymentStatus", async (req, res) => {
  const { paymentStatus, orderId, paymentId, upiId, user, amount } = req.body;

  try {
      // Save payment details in MongoDB
      const payment = new Payment({
          paymentId,
          orderId,
          status: paymentStatus,
          upiId,
          user,
          amount,
      });
      await payment.save();

      console.log("Payment details saved successfully:", payment);
      res.json({ success: true, message: `Payment status updated to ${paymentStatus}` });
  } catch (error) {
      console.error("Error saving payment details:", error);
      res.status(500).json({ success: false, message: "Failed to save payment details." });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
