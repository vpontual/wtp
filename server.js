const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());

// Senate API Endpoint
app.get('/api/senate/:congress/:session', async (req, res) => {
  const { congress, session } = req.params;
  const url = `https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_${congress}_${session}.json`;

  try {
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error(`Error fetching Senate data: ${error.message}`);
    res.status(error.response?.status || 500).send('Error fetching data from Senate API');
  }
});

// House API Endpoint
app.get('/api/house/:year', async (req, res) => {
  const { year } = req.params;
  const url = `https://clerk.house.gov/evs/${year}/ROLLS.xml`;

  try {
    const response = await axios.get(url, { responseType: 'text' });
    res.set('Content-Type', 'application/xml');
    res.send(response.data);
  } catch (error) {
    console.error(`Error fetching House data: ${error.message}`);
    res.status(error.response?.status || 500).send('Error fetching data from House API');
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
