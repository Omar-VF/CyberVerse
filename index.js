let mediaRecorder;
let recordedChunks = [];

const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');

async function startRecording() {
  try {
    // Request user to choose what to share - tab, window or screen
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style = 'display:none';
      a.href = url;  
      a.download = 'gmeet-recording.webm';
      a.click();
      window.URL.revokeObjectURL(url);
    };

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

startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);