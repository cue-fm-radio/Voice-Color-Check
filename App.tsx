import React, { useState } from 'react';
import Recorder from './components/Recorder';
import ResultChart from './components/ResultChart';
import { analyzeVoiceAudio } from './services/geminiService';
import { AppState, AnalysisResult } from './types';

// Hamamatsu & Music Themed Icons
const MusicNoteIcon = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
  </svg>
);

const UnagiIcon = ({ className }: { className: string }) => (
  <svg viewBox="0 0 100 30" fill="currentColor" className={className}>
    <path d="M10,15 Q25,5 40,15 T70,15 T90,15" stroke="currentColor" strokeWidth="8" strokeLinecap="round" fill="none" />
    <circle cx="8" cy="15" r="4" fill="currentColor" />
  </svg>
);

const GyozaIcon = ({ className }: { className: string }) => (
  <svg viewBox="0 0 100 60" fill="currentColor" className={className}>
    <path d="M10,50 Q50,5 90,50 Z" />
    <path d="M20,50 Q25,40 30,50 M40,50 Q45,35 50,50 M60,50 Q65,40 70,50" stroke="white" strokeWidth="2" fill="none" />
  </svg>
);

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check for shared data in URL on mount
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('data');
    if (sharedData) {
      import('./utils/share').then(({ decompressResult }) => {
        const decodedResult = decompressResult(sharedData);
        if (decodedResult) {
          setResult(decodedResult);
          setAppState(AppState.RESULT);
          // Clean up URL without reloading
          window.history.replaceState({}, '', window.location.pathname);
        }
      });
    }
  }, []);

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setAppState(AppState.ANALYZING);
    setErrorMsg(null);
    try {
      const analysisData = await analyzeVoiceAudio(audioBlob);
      setResult(analysisData);
      setAppState(AppState.RESULT);
    } catch (error) {
      console.error(error);
      setAppState(AppState.ERROR);
      setErrorMsg("音声の解析に失敗しました。もう一度お試しください。(APIキーの設定を確認してください)");
    }
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-yellow-50 to-orange-50 text-gray-800 font-sans selection:bg-orange-200">

      {/* Background Decoration: Hamamatsu Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none select-none">
        {/* Lake Hamana Sky Blue Blob */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        {/* Mikan Orange Blob */}
        <div className="absolute top-0 -right-4 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        {/* Gyoza/Unagi Yellow Blob */}
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

        {/* Floating Icons */}
        <div className="absolute top-1/4 left-10 text-sky-300 opacity-40 animate-bounce duration-3000">
          <MusicNoteIcon className="w-16 h-16 transform -rotate-12" />
        </div>
        <div className="absolute bottom-1/4 right-10 text-orange-300 opacity-40 animate-pulse">
          <MusicNoteIcon className="w-12 h-12 transform rotate-12" />
        </div>
        <div className="absolute top-20 right-20 text-yellow-500 opacity-10">
          <GyozaIcon className="w-24 h-24 transform rotate-12" />
        </div>
        <div className="absolute bottom-10 left-10 text-gray-400 opacity-10">
          <UnagiIcon className="w-32 h-12 transform -rotate-6" />
        </div>
      </div>

      <header id="app-header" className="relative z-10 pt-8 pb-6 flex flex-col items-center space-y-4">
        <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-[2rem] shadow-lg border-2 border-orange-100 flex flex-col md:flex-row items-center gap-6 md:gap-8 max-w-2xl w-[95%]">
          {/* Logo Image */}
          <div className="w-28 h-28 md:w-32 md:h-32 relative flex-shrink-0 bg-white rounded-full p-1">
            <img
              src="/logo.png"
              alt="エンカレ！ロゴ"
              className="w-full h-full object-contain rounded-full"
              onError={(e) => {
                // Fallback if image not found
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
            {/* Fallback Text Logo */}
            <div className="hidden absolute inset-0 flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full text-white font-bold border-4 border-sky-500">
              エンカレ
            </div>
          </div>

          <div className="text-center md:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
              <span className="bg-sky-100 text-sky-600 px-3 py-1 rounded-full text-xs font-bold tracking-wider">静岡大学放送研究会 Cue-FM 浜松</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-sky-500 drop-shadow-sm font-zen-maru leading-tight">
              エンカレ！<br /><span className="text-3xl md:text-4xl text-gray-600">声診断</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-4 flex flex-col items-center min-h-[60vh] justify-center">

        {appState === AppState.IDLE && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full flex justify-center">
            <Recorder onRecordingComplete={handleRecordingComplete} />
          </div>
        )}

        {appState === AppState.ANALYZING && (
          <div className="flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-500 bg-white/60 backdrop-blur-md p-10 rounded-3xl border border-white/50 shadow-xl">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-4 border-orange-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-sky-500 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl">🎤</span>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-700">音声を解析中...</h3>
              <p className="text-gray-500 mt-2">AIが声のトーンや響きから<br />あなたのカラータイプを診断しています</p>
            </div>
          </div>
        )}

        {appState === AppState.RESULT && result && (
          <ResultChart result={result} onReset={handleReset} />
        )}

        {appState === AppState.ERROR && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center shadow-lg animate-in shake">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h3 className="text-lg font-bold text-red-800 mb-2">エラーが発生しました</h3>
            <p className="text-red-600 mb-6">{errorMsg}</p>
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md"
            >
              最初に戻る
            </button>
          </div>
        )}
      </main>

      <footer className="relative z-10 py-8 text-center text-gray-500 text-xs">
        <div className="flex justify-center items-center gap-4 mb-2 opacity-50">
          <GyozaIcon className="w-8 h-8" />
          <UnagiIcon className="w-12 h-4" />
        </div>
        <p className="font-medium">Produced by 静岡大学放送研究会 Cue-FM浜松</p>
      </footer>
    </div>
  );
};

export default App;