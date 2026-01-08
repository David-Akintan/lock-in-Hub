// Mock Zoom Service
// In a real app, this would communicate with your backend which holds the Zoom OAuth credentials

export interface ZoomMeeting {
  id: string;
  joinUrl: string;
  startUrl: string; // URL for host to start meeting
  topic: string;
}

export interface ZoomRecording {
  downloadUrl: string;
  playUrl: string;
  duration: string; // formatted HH:MM:SS or MM:SS
  startTime: string;
}

const MOCK_MEETING_ID = '8392019384';

export const createZoomMeeting = async (topic: string): Promise<ZoomMeeting> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return {
    id: MOCK_MEETING_ID,
    joinUrl: `https://zoom.us/j/${MOCK_MEETING_ID}`,
    startUrl: `https://zoom.us/s/${MOCK_MEETING_ID}`, // In reality, this contains a token
    topic
  };
};

export const getZoomRecording = async (meetingId: string): Promise<ZoomRecording> => {
  // Simulate API delay and processing time
  await new Promise(resolve => setTimeout(resolve, 2000));

  const now = new Date();
  const durationMinutes = Math.floor(Math.random() * 60) + 15; // Random 15-75 mins
  
  return {
    downloadUrl: `https://zoom.us/rec/download/${meetingId}`,
    playUrl: `https://zoom.us/rec/play/${meetingId}`,
    duration: `${durationMinutes}:00`,
    startTime: new Date(now.getTime() - durationMinutes * 60000).toISOString()
  };
};