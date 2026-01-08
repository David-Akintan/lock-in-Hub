
/**
 * BACKEND SERVER TEMPLATE (Node.js / Express)
 * 
 * Dependencies:
 * npm install express cors dotenv agora-token axios
 */

const express = require('express');
const cors = require('cors');
const { RtcTokenBuilder, RtcRole } = require('agora-token');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;
const CUSTOMER_ID = process.env.AGORA_CUSTOMER_ID;
const CUSTOMER_SECRET = process.env.AGORA_CUSTOMER_SECRET;
const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const BUCKET_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const BUCKET_SECRET_KEY = process.env.S3_SECRET_KEY;

// Base64 encode customer ID and secret for Basic Auth
const AUTHORIZATION = `Basic ${Buffer.from(`${CUSTOMER_ID}:${CUSTOMER_SECRET}`).toString('base64')}`;

// --- ROUTES ---

/**
 * 1. GET TOKEN
 * Generates an RTC token for a client to join a channel.
 */
app.post('/api/token', (req, res) => {
  const { channelName, uid, role } = req.body;
  
  if (!channelName) return res.status(400).json({ error: 'channelName is required' });

  // Expiration time (24 hours)
  const expirationTimeInSeconds = 86400;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  // Role: PUBLISHER (1) for Mentor, SUBSCRIBER (2) for Student
  const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid || 0, // 0 allows Agora to assign UID
    rtcRole,
    privilegeExpiredTs
  );

  res.json({ token, uid: uid || 0 });
});

/**
 * 2. START RECORDING
 * Calls Agora Cloud Recording API to start recording the session to S3.
 */
app.post('/api/recording/start', async (req, res) => {
  const { channelName, uid } = req.body;

  try {
    // Step 1: Acquire Resource
    const acquire = await axios.post(
      `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/acquire`,
      {
        cname: channelName,
        uid: String(uid),
        clientRequest: { resourceExpiredHour: 24 },
      },
      { headers: { Authorization: AUTHORIZATION } }
    );

    const resourceId = acquire.data.resourceId;

    // Step 2: Start Recording
    const start = await axios.post(
      `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/resourceid/${resourceId}/mode/mix/start`,
      {
        cname: channelName,
        uid: String(uid),
        clientRequest: {
          token: req.body.token, // Token for the recording bot
          recordingConfig: {
            maxIdleTime: 30,
            streamTypes: 2, // Audio & Video
            channelType: 0, // Communication channel
            transcodingConfig: {
              height: 720, width: 1280, bitrate: 2260, fps: 30, mixedVideoLayout: 1, backgroundColor: '#000000'
            }
          },
          storageConfig: {
            vendor: 1, // AWS S3
            region: 1, // US_EAST_1 (Change as needed)
            bucket: BUCKET_NAME,
            accessKey: BUCKET_ACCESS_KEY,
            secretKey: BUCKET_SECRET_KEY,
            fileNamePrefix: ["recordings", channelName]
          }
        }
      },
      { headers: { Authorization: AUTHORIZATION } }
    );

    res.json({ resourceId, sid: start.data.sid });

  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to start recording' });
  }
});

/**
 * 3. STOP RECORDING
 * Stops the cloud recording.
 */
app.post('/api/recording/stop', async (req, res) => {
  const { channelName, uid, resourceId, sid } = req.body;

  try {
    const stop = await axios.post(
      `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`,
      {
        cname: channelName,
        uid: String(uid),
        clientRequest: {}
      },
      { headers: { Authorization: AUTHORIZATION } }
    );

    res.json(stop.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop recording' });
  }
});

// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Lock-In Backend running on port ${PORT}`);
});