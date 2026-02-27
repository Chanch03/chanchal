const videoElement = document.getElementById("webcam");
const riskDisplay = document.getElementById("riskCircle");
const eventLog = document.getElementById("eventLog");

let riskScore = 0;
let faceMissingStart = null;

// ✅ Increase risk helper
function increaseRisk(amount, reason) {
    riskScore += amount;
    riskDisplay.textContent = riskScore;
  
    // 🎨 color logic
    if (riskScore < 30) {
      riskDisplay.style.background = "green";
    } else if (riskScore < 60) {
      riskDisplay.style.background = "orange";
    } else {
      riskDisplay.style.background = "red";
    }
  
    const li = document.createElement("li");
    li.textContent = `[${new Date().toLocaleTimeString()}] ${reason}`;
    eventLog.prepend(li);
  }

// 🎥 Start webcam
async function startWebcam() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });
  videoElement.srcObject = stream;
}

startWebcam();

// 🧠 MediaPipe FaceMesh
const faceMesh = new FaceMesh({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  maxNumFaces: 2,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

// 🔥 Face detection logic
faceMesh.onResults((results) => {
  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
    // Face missing
    if (!faceMissingStart) {
      faceMissingStart = Date.now();
    }

    if (Date.now() - faceMissingStart > 3000) {
      increaseRisk(15, "Face not detected");
      faceMissingStart = Date.now(); // reset so it doesn't spam
    }
  } else {
    faceMissingStart = null;

    // Multiple faces check
    if (results.multiFaceLandmarks.length > 1) {
      increaseRisk(25, "Multiple faces detected");
    }
  }
});

// 🎥 Attach camera to MediaPipe
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({ image: videoElement });
  },
  width: 640,
  height: 480
});

camera.start();

// 🚨 Tab switch detection
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      increaseRisk(20, "Tab switched or window minimized");
    }
  });

  // 🎤 Audio spike detection
async function startAudioMonitoring() {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(audioStream);
      const analyser = audioContext.createAnalyser();
  
      source.connect(analyser);
      analyser.fftSize = 512;
  
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
  
      function checkAudio() {
        analyser.getByteFrequencyData(dataArray);
  
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
  
        const average = sum / dataArray.length;
  
        // 🔥 adjust threshold if needed
        if (average > 60) {
          increaseRisk(10, "Suspicious audio detected");
        }
  
        requestAnimationFrame(checkAudio);
      }
  
      checkAudio();
    } catch (err) {
      console.error("Microphone access denied", err);
    }
  }
  
  // start audio monitoring
  startAudioMonitoring();