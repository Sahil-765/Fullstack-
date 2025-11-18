require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Check required environment variables
if (!process.env.MONGODB_URI) {
  console.error('MongoDB connection string is not set in .env file');
  process.exit(1);
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_jwt_secret_key') {
  console.error('JWT_SECRET is not set or is using the default value in .env file');
  console.error('Please set a strong, unique JWT_SECRET in your .env file');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: 'majority'
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  console.log('\nTo set up a free MongoDB Atlas database:');
  console.log('1. Go to https://www.mongodb.com/cloud/atlas/register');
  console.log('2. Create a free account and a new cluster');
  console.log('3. Go to Database Access and add a new database user');
  console.log('4. Go to Network Access and add your IP address');
  console.log('5. Go to Database and click "Connect" to get your connection string');
  console.log('6. Update the MONGODB_URI in the .env file with your connection string');
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/profiles', profileRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('Roommate Finder API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
