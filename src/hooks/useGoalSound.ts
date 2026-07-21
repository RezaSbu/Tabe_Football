export function playGoalSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const whistle = (time: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(2200, audioCtx.currentTime + time);
      gain.gain.setValueAtTime(0, audioCtx.currentTime + time);
      gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + time + 0.35);
      osc.start(audioCtx.currentTime + time);
      osc.stop(audioCtx.currentTime + time + 0.35);
    };
    
    whistle(0);
    whistle(0.35);
    
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(500, audioCtx.currentTime);
    filter.Q.setValueAtTime(1.5, audioCtx.currentTime);
    
    const gainNode = audioCtx.createGain();
    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.15);
    gainNode.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 1.25);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2);
    
    whiteNoise.start(audioCtx.currentTime + 0.1);
    whiteNoise.stop(audioCtx.currentTime + 2.15);
  } catch (e) {
    console.warn("Audio context failure: ", e);
  }
}

export function showSystemNotification(title: string, body: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=150"
    });
  }
}
