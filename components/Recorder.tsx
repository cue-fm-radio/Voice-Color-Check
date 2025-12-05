import React, { useState, useRef, useEffect, useCallback } from 'react';

interface RecorderProps {
  onRecordingComplete: (blob: Blob) => void;
}

const Recorder: React.FC<RecorderProps> = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15); // 15 seconds recording
  const [showConsentModal, setShowConsentModal] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(audioBlob);
        stopVisualizer();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTimeLeft(15);

      // Setup Visualizer
      setupVisualizer(stream);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("マイクへのアクセスが許可されていません。設定を確認してください。");
    }
  };

  const setupVisualizer = (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;
    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;
    drawVisualizer();
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // Fade effect
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        
        // Encare Brand Colors (Orange to Sky Blue)
        const hue = 30 + (i / bufferLength) * 160; 
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;

        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  useEffect(() => {
    let interval: any;
    if (isRecording && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRecording && timeLeft === 0) {
      stopRecording();
    }
    return () => clearInterval(interval);
  }, [isRecording, timeLeft, stopRecording]);

  return (
    <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-md mx-auto p-8 bg-white/70 backdrop-blur-md rounded-[2rem] shadow-2xl border border-sky-100/50">
      
      <div className="relative w-full h-48 bg-gray-900 rounded-2xl overflow-hidden shadow-inner ring-4 ring-orange-100">
        <canvas 
          ref={canvasRef} 
          width={400} 
          height={200} 
          className="w-full h-full object-cover opacity-90"
        />
        {!isRecording && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-black/40">
            <div className="text-center">
              <span className="text-3xl block mb-2">🎙️</span>
              <span className="text-sm font-medium tracking-wider">録音待機中...</span>
            </div>
          </div>
        )}
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800">
          {isRecording ? "録音中..." : "声を録音する"}
        </h2>
        <p className="text-gray-600 text-sm">
          {isRecording 
            ? "自然な声で話してください（自己紹介など）" 
            : "ボタンを押して15秒間話してください"}
        </p>
      </div>

      {isRecording ? (
        <div className="relative flex items-center justify-center w-24 h-24">
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle
              className="text-gray-200"
              strokeWidth="4"
              stroke="currentColor"
              fill="transparent"
              r="40"
              cx="48"
              cy="48"
            />
            <circle
              className="text-orange-500 transition-all duration-1000 ease-linear"
              strokeWidth="4"
              strokeDasharray={251}
              strokeDashoffset={251 - (251 * (15 - timeLeft)) / 15}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="40"
              cx="48"
              cy="48"
            />
          </svg>
          <span className="text-3xl font-bold text-orange-600 font-mono">{timeLeft}</span>
        </div>
      ) : (
        <button
          onClick={() => setShowConsentModal(true)}
          className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-white transition-all duration-200 bg-gradient-to-br from-orange-400 via-orange-500 to-sky-500 rounded-full hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-orange-300"
        >
          <span className="absolute inset-0 w-full h-full rounded-full animate-pulse bg-gradient-to-r from-orange-300 via-yellow-300 to-sky-300 opacity-50 blur-lg group-hover:opacity-75"></span>
          <span className="relative flex items-center gap-3 text-lg">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
             診断スタート
          </span>
        </button>
      )}

      {/* Consent Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 bg-white rounded-3xl shadow-2xl p-8 space-y-6 animate-in fade-in scale-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">音声データの送信について</h3>
                <p className="text-sm text-gray-600 mt-1">ご確認ください</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-700 leading-relaxed">
                このアプリはGoogle Gemini APIを使用して、あなたの音声を分析し、声のトーンや響きから個性や特徴を診断します。
              </p>
              <p className="text-sm text-gray-700 leading-relaxed font-semibold">
                ✓ 音声データはGoogle Gemini APIに送信されます
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                詳細は<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Googleのプライバシーポリシー</a>をご確認ください。
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowConsentModal(false);
                  startRecording();
                }}
                className="w-full px-6 py-3 font-bold text-white bg-gradient-to-r from-orange-500 to-sky-500 rounded-lg hover:shadow-lg transition-all duration-200"
              >
                同意して録音を開始
              </button>
              <button
                onClick={() => setShowConsentModal(false)}
                className="w-full px-6 py-3 font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recorder;