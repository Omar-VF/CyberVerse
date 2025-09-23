// Set your ngrok URL here
const NGROK_URL = 'http://localhost:5000';
let mediaRecorder;
let recordedChunks = [];

const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');

// The startRecording() and stopRecording() functions remain the same...
async function startRecording() {
  try {
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

    // --- MODIFIED SECTION STARTS HERE ---
    mediaRecorder.onstop = function() {
      const blob = new Blob(recordedChunks, {
        type: 'video/webm'
      });
      recordedChunks = [];

      // This function will handle the upload
      uploadToCloudinary(blob);
    };
    // --- MODIFIED SECTION ENDS HERE ---

    mediaRecorder.start();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    console.log('Recording started');

  } catch (err) {
    console.error('Error: ' + err);
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    startBtn.disabled = false;
    stopBtn.disabled = true;
    console.log('Recording stopped');
  }
}

// --- NEW UPLOAD FUNCTION ---
function uploadToCloudinary(videoBlob) {
  // 1. Set up your Cloudinary details
  const cloudName = 'dhsjgmbrh'; // <-- ⚠️ REPLACE WITH YOUR CLOUD NAME
  const uploadPreset = 'gmeet-recorder'; // <-- ⚠️ REPLACE WITH YOUR PRESET NAME

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;

  // 2. Create a FormData object to send the file
  const formData = new FormData();
  formData.append('file', videoBlob, 'gmeet-recording.webm');
  formData.append('upload_preset', uploadPreset);

  console.log('Uploading to Cloudinary...');

  // 3. Use the fetch API to send the video
  fetch(url, {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.secure_url) {
  const messageEl = document.getElementById('message');
  messageEl.style.display = 'block';
  messageEl.textContent = 'Upload Successful!';
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
            console.log('Calling fetchSummary()');
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
      console.error('Error uploading:', error);
    });
}

// Fetch summary from Flask backend and display it
function fetchSummary(retries = 20, interval = 3000, previousSummary = null) {
  const messageEl = document.getElementById('message');
  const downloadBtn = document.getElementById('download-summary');
  function poll(attempt, lastSummary) {
  fetch(`${NGROK_URL}/summary`)
      .then(response => response.json())
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
          } else if (attempt < retries) {
            messageEl.style.display = 'block';
            messageEl.textContent = 'Waiting for new summary...';
            downloadBtn.style.display = 'none';
            setTimeout(() => poll(attempt + 1, lastSummary), interval);
          } else {
            messageEl.style.display = 'block';
            messageEl.textContent = 'No new summary available.';
            downloadBtn.style.display = 'none';
          }
        } else if (attempt < retries) {
          messageEl.style.display = 'block';
          messageEl.textContent = 'Waiting for summary...';
          downloadBtn.style.display = 'none';
          setTimeout(() => poll(attempt + 1, lastSummary), interval);
        } else {
          messageEl.style.display = 'block';
          messageEl.textContent = 'No summary available.';
          downloadBtn.style.display = 'none';
        }
      })
      .catch(error => {
        if (attempt < retries) {
          messageEl.style.display = 'block';
          messageEl.textContent = 'Waiting for summary...';
          downloadBtn.style.display = 'none';
          setTimeout(() => poll(attempt + 1, lastSummary), interval);
        } else {
          messageEl.style.display = 'block';
          messageEl.textContent = 'Error fetching summary.';
          downloadBtn.style.display = 'none';
        }
        console.error('Error fetching summary:', error);
      });
  }
  poll(0, previousSummary);
}


startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);