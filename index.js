// Set your ngrok URL here
const NGROK_URL = 'https://554c736c7b69.ngrok-free.app/';
let mediaRecorder;
let recordedChunks = [];

const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');

// The startRecording() and stopRecording() functions remain the same...
async function startRecording() {
  try {
    const messageEl = document.getElementById('message');
    messageEl.style.display = 'block';
    messageEl.textContent = 'Requesting screen and audio capture...';
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
    });

    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = function(event) {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = function() {
      const blob = new Blob(recordedChunks, {
        type: 'video/webm'
      });
      recordedChunks = [];

      // Status update: Uploading video
      messageEl.style.display = 'block';
      messageEl.textContent = 'Uploading video to Cloudinary...';
      uploadToCloudinary(blob);
    };

    mediaRecorder.start();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    messageEl.style.display = 'block';
    messageEl.textContent = 'Recording in progress...';
    console.log('Recording started');

  } catch (err) {
    const messageEl = document.getElementById('message');
    messageEl.style.display = 'block';
    messageEl.textContent = 'Error: ' + err;
    console.error('Error: ' + err);
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    const messageEl = document.getElementById('message');
    messageEl.style.display = 'block';
    messageEl.textContent = 'Stopping recording...';
    mediaRecorder.stop();
    startBtn.disabled = false;
    stopBtn.disabled = true;
    console.log('Recording stopped');
  }
}

// --- NEW UPLOAD FUNCTION ---
function uploadToCloudinary(videoBlob) {
  const cloudName = 'dhsjgmbrh';
  const uploadPreset = 'gmeet-recorder';
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;
  const formData = new FormData();
  formData.append('file', videoBlob, 'gmeet-recording.webm');
  formData.append('upload_preset', uploadPreset);
  const messageEl = document.getElementById('message');
  messageEl.style.display = 'block';
  messageEl.textContent = 'Uploading video to Cloudinary...';
  fetch(url, {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.secure_url) {
        window.latestVideoUrl = data.secure_url;
        messageEl.style.display = 'block';
        messageEl.textContent = 'Upload successful! Transcribing and generating summary...';
        // Wait for backend confirmation before polling for summary
        fetch(`${NGROK_URL}/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notification_type: 'upload', secure_url: data.secure_url })
          })
          .then(response => response.json())
          .then(webhookData => {
            console.log('Webhook response:', webhookData);
            if (webhookData.status === 'success') {
              messageEl.style.display = 'block';
              messageEl.textContent = 'Video uploaded! Generating summary...';
              fetchSummary();
            } else {
              messageEl.style.display = 'block';
              messageEl.textContent = 'Summary generation failed.';
            }
          })
          .catch(error => {
            messageEl.style.display = 'block';
            messageEl.textContent = 'Error triggering summary generation.';
            console.error('Error triggering summary generation:', error);
          });
      } else {
        messageEl.style.display = 'block';
        messageEl.textContent = 'Upload failed';
      }
    })
    .catch(error => {
      messageEl.style.display = 'block';
      messageEl.textContent = 'Error uploading video.';
      console.error('Error uploading:', error);
    });
}

// Fetch summary from Flask backend and display it
function fetchSummary(retries = 20, interval = 3000, previousSummary = null) {
  const messageEl = document.getElementById('message');
  const downloadBtn = document.getElementById('download-summary');
  const downloadVideoBtn = document.getElementById('download-video');
  function poll(attempt, lastSummary) {
    messageEl.style.display = 'block';
    if (attempt === 0) {
      messageEl.textContent = 'Waiting for summary from backend...';
    } else {
      messageEl.textContent = `Polling for summary... (Attempt ${attempt + 1}/${retries})`;
    }
    fetch(`${NGROK_URL}/summary`)
      .then(response => {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Response is not JSON');
        }
        return response.json();
      })
      .then(data => {
        console.log('Summary fetch response:', data);
        if (typeof data.summary === 'string' && data.summary.length > 0) {
          if (lastSummary === null || data.summary !== lastSummary) {
            // Hide summary text, show download button
            messageEl.style.display = 'none';
            downloadBtn.style.display = 'inline-block';
            downloadBtn.onclick = function() {
              const blob = new Blob([data.summary], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'meeting-summary.txt';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            };
            // Show video download button if available
            if (window.latestVideoUrl) {
              downloadVideoBtn.style.display = 'inline-block';
              downloadVideoBtn.onclick = async function() {
                try {
                  const response = await fetch(window.latestVideoUrl);
                  const blob = await response.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'meeting-video.webm';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch (err) {
                  alert('Failed to download video.');
                  console.error('Video download error:', err);
                }
              };
            } else {
              downloadVideoBtn.style.display = 'none';
            }
          } else if (attempt < retries) {
            setTimeout(() => poll(attempt + 1, lastSummary), interval);
          } else {
            messageEl.style.display = 'block';
            messageEl.textContent = 'No new summary available.';
            downloadBtn.style.display = 'none';
            downloadVideoBtn.style.display = 'none';
          }
        } else if (attempt < retries) {
          setTimeout(() => poll(attempt + 1, lastSummary), interval);
        } else {
          messageEl.style.display = 'block';
          messageEl.textContent = 'No summary available.';
          downloadBtn.style.display = 'none';
          downloadVideoBtn.style.display = 'none';
        }
      })
      .catch(error => {
        messageEl.style.display = 'block';
        messageEl.textContent = 'Error fetching summary: ' + error.message;
        downloadBtn.style.display = 'none';
        downloadVideoBtn.style.display = 'none';
        console.error('Error fetching summary:', error);
      });
  }
  poll(0, previousSummary);
}


startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);