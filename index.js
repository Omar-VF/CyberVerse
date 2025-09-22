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
        document.getElementById('message').textContent='Upload Successful!';
        // You can now use this URL, e.g., save it to a database
      } else {
        document.getElementById('messsage').textContent='Upload failed';
      }
    })
    .catch(error => {
      console.error('Error uploading:', error);
    });
}


startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);