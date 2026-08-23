import React, { useState, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

export const VolumeMeter: React.FC = () => {
  const { listening } = useSpeechRecognition();
  const [volume, setVolume] = useState<number>(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (listening) {
      startVolumeTracking();
    } else {
      stopVolumeTracking();
    }

    return () => stopVolumeTracking();
  }, [listening]);

  const startVolumeTracking = async (): Promise<void> => {
    try {
      // 1. Get permission and stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 2. Set up Web Audio API nodes
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 256; // Small size for fast volume tracking
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      source.connect(analyser);

      // Store references to clean up later
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      // 3. Start the measurement loop
      const updateVolume = (): void => {
        analyser.getByteFrequencyData(dataArray);

        // Calculate average frequency value
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
        }
        const average = total / bufferLength;

        // Map the average value (0-255) to a scale of 0-100 for a progress bar
        const volumePercentage = Math.min(100, Math.round((average / 128) * 100));
        setVolume(volumePercentage);

        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.error('Error accessing microphone for volume tracking:', err);
    }
  };

  const stopVolumeTracking = (): void => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    setVolume(0);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <button onClick={()=>SpeechRecognition.startListening()}>Start Listening</button>
      <button onClick={SpeechRecognition.stopListening}>Stop Listening</button>

      <div style={{ marginTop: '20px' }}>
        <p>Status: {listening ? '🎙️ Listening...' : '🛑 Stopped'}</p>

        {/* Visual Volume Feedback Bar */}
        <div
          style={{
            width: '200px',
            height: '20px',
            backgroundColor: '#e0e0e0',
            borderRadius: '10px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${volume}%`,
              height: '100%',
              backgroundColor: volume > 70 ? '#ff4d4f' : '#52c41a', // Turns red if too loud
              transition: 'width 0.05s ease',
            }}
            className='duration-200'
          />
        </div>
        <small>Volume Level: {volume}%</small>
      </div>
    </div>
  );
};
