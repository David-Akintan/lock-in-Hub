// Agora Service - Connects to your Render backend
const getBackendUrl = () => {
  return import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
};

export interface AgoraToken {
  token: string;
  uid: number;
}

export interface RecordingConfig {
  resourceId: string;
  sid: string;
  mode: 'mix';
}

// Get Agora token from backend
export const getAgoraToken = async (channelName: string, uid: number = 0): Promise<AgoraToken> => {
  try {
    const response = await fetch(`${getBackendUrl()}/api/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelName,
        uid,
        role: 'publisher'
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get Agora token');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting Agora token:', error);
    throw error;
  }
};

// Start cloud recording
export const startRecording = async (channelName: string, uid: number, token: string): Promise<RecordingConfig> => {
  try {
    const response = await fetch(`${getBackendUrl()}/api/recording/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelName,
        uid,
        token
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to start recording');
    }

    return await response.json();
  } catch (error) {
    console.error('Error starting recording:', error);
    throw error;
  }
};

// Stop cloud recording
export const stopRecording = async (channelName: string, resourceId: string, sid: string, token: string): Promise<any> => {
  try {
    const response = await fetch(`${getBackendUrl()}/api/recording/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelName,
        resourceId,
        sid,
        token
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to stop recording');
    }

    return await response.json();
  } catch (error) {
    console.error('Error stopping recording:', error);
    throw error;
  }
};