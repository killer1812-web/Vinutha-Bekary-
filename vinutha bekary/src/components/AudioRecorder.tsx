import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Upload, AlertCircle } from 'lucide-react';

interface AudioRecorderProps {
  onAudioReady: (audioUrl: string | undefined) => void;
  existingAudioUrl?: string;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAudioReady, existingAudioUrl }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(existingAudioUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micSupported, setMicSupported] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicSupported(false);
    }
  }, []);

  const startRecording = async () => {
    try {
      setMicError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setAudioUrl(base64data);
          onAudioReady(base64data);
        };
        // Stop all audio tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone error:', err);
      setMicError('Microphone access blocked or unavailable. You can upload an audio file instead.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const deleteRecording = () => {
    setAudioUrl(undefined);
    onAudioReady(undefined);
    setIsPlaying(false);
    setRecordingSeconds(0);
  };

  const togglePlayback = () => {
    if (!audioUrl) return;
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio(audioUrl);
      audioElementRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAudioUrl(result);
        onAudioReady(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-[#FFFDF9] border border-[#F0E6DD] rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-[#42281D] flex items-center gap-1.5">
          <Mic className="w-4 h-4 text-[#E06D80]" />
          Record Voice Instructions (Optional)
        </label>
        <span className="text-xs text-[#8A7569]">Max 60 seconds</span>
      </div>
      <p className="text-xs text-[#6B5A50] mb-3">
        Prefer to speak? Explain custom cake decorations, spelling of names, or flavour requests in your own voice.
      </p>

      {micError && (
        <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{micError}</span>
        </div>
      )}

      {/* Recording in progress */}
      {isRecording && (
        <div className="bg-[#FFF5F5] border border-[#FBCAD0] rounded-lg p-3 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <div className="flex items-end gap-1 h-6">
              <span className="w-1 bg-[#E06D80] rounded animate-soundwave-1" />
              <span className="w-1 bg-[#E06D80] rounded animate-soundwave-2" />
              <span className="w-1 bg-[#E06D80] rounded animate-soundwave-3" />
              <span className="w-1 bg-[#E06D80] rounded animate-soundwave-4" />
              <span className="w-1 bg-[#E06D80] rounded animate-soundwave-5" />
            </div>
            <span className="text-sm font-mono font-bold text-red-600">{formatTime(recordingSeconds)}</span>
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-1.5 bg-[#42281D] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-[#2C1A11] transition-all font-medium cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Stop Recording
          </button>
        </div>
      )}

      {/* Recorded Audio Ready */}
      {!isRecording && audioUrl && (
        <div className="bg-[#F8F4EF] border border-[#E2D5C8] rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlayback}
              className="w-9 h-9 rounded-full bg-[#E06D80] text-white flex items-center justify-center hover:bg-[#C95468] transition-colors shadow-sm cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play voice note'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <div>
              <p className="text-xs font-semibold text-[#42281D]">Voice message recorded</p>
              <p className="text-[11px] text-[#8A7569]">{isPlaying ? 'Playing...' : 'Click play to listen back'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={deleteRecording}
            className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
            title="Delete recording"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Idle state - record or upload */}
      {!isRecording && !audioUrl && (
        <div className="flex flex-wrap items-center gap-2">
          {micSupported && (
            <button
              type="button"
              onClick={startRecording}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-[#FDE8E9] hover:bg-[#FBCAD0] text-[#B83C50] text-xs font-semibold py-2.5 px-3 rounded-lg border border-[#F8B4BD] transition-all cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              Tap to Record Audio
            </button>
          )}

          <label className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-white hover:bg-[#FAF6F0] text-[#5C3826] text-xs font-semibold py-2.5 px-3 rounded-lg border border-[#D9C8B8] transition-all cursor-pointer">
            <Upload className="w-4 h-4 text-[#8A7569]" />
            Upload Audio File
            <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      )}
    </div>
  );
};
