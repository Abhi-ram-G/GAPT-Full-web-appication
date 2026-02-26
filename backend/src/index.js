require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const fileRoutes = require('./routes/fileRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', routes);
app.use('/api/files', fileRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
