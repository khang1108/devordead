/**
 * Real browser audio engine (Web Audio API + MediaDevices + Web Speech Synthesis).
 * Hỗ trợ kiểm tra micro/loa thực tế (UC10), thu sóng âm thật cho Waveform & 3D AI Orb (UC05, UC11, UC12).
 */

export interface LiveMicHandle {
  stream: MediaStream;
  audioCtx: AudioContext;
  analyser: AnalyserNode;
  stop: () => void;
}

export async function startMicrophoneStream(): Promise<LiveMicHandle> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Trình duyệt không hỗ trợ MediaDevices API (cần HTTPS hoặc localhost).");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx();
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.78;
  source.connect(analyser);

  const stop = () => {
    stream.getTracks().forEach((track) => track.stop());
    source.disconnect();
    void audioCtx.close().catch(() => undefined);
  };

  return { stream, audioCtx, analyser, stop };
}

export async function testMicrophonePermission(): Promise<{ ok: true; deviceLabel: string }> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Trình duyệt chưa hỗ trợ truy cập micro (MediaDevices API).");
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const track = stream.getAudioTracks()[0];
  const deviceLabel = track?.label || "Microphone mặc định";
  stream.getTracks().forEach((t) => t.stop());
  return { ok: true, deviceLabel };
}

export async function playTestTone(): Promise<void> {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    throw new Error("Trình duyệt không hỗ trợ Web Audio API.");
  }
  const ctx = new AudioCtx();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  const now = ctx.currentTime;
  const playNote = (freq: number, start: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  };

  playNote(523.25, now, 0.14); // C5
  playNote(659.25, now + 0.16, 0.22); // E5

  window.setTimeout(() => {
    void ctx.close().catch(() => undefined);
  }, 600);
}

export function speakText(text: string, lang: "vi-VN" | "en-US" = "vi-VN", onEnd?: () => void): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return () => undefined;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1;
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utterance);
    return () => {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    };
  } catch {
    onEnd?.();
    return () => undefined;
  }
}
