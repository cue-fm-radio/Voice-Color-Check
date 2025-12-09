import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { AnalysisResult, ColorParameter } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas';

interface ResultChartProps {
  result: AnalysisResult;
  onReset: () => void;
  isShared?: boolean;
}

const ResultChart: React.FC<ResultChartProps> = ({ result, onReset, isShared = false }) => {
  const [showQR, setShowQR] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Sort or ensure order if necessary. Currently relying on Gemini to return correct order, 
  // but could enforce it here based on ID.
  const data = result.parameters;

  // Custom Tick Component to render colored labels
  const CustomTick = ({ payload, x, y, textAnchor, stroke, radius }: any) => {
    const param = data.find(d => d.label === payload.value || d.subLabel === payload.value);

    return (
      <g className="layer-axis-tick">
        <text
          x={x}
          y={y}
          textAnchor={textAnchor}
          fill={param ? param.colorCode : '#666'}
          className="text-xs font-bold"
          dy={4}
        >
          {payload.value}
        </text>
      </g>
    );
  };

  const handleShare = async () => {
    if (shareUrl) {
      setShowQR(true);
      return;
    }

    setIsGenerating(true);
    setShowQR(true); // Show modal with loading state

    try {
      const captureElement = document.getElementById('capture-template');
      if (!captureElement) return;

      // Capture the dedicated template
      const canvas = await html2canvas(captureElement, {
        scale: 2, // Higher resolution
        backgroundColor: '#fff', // Ensure white background
        useCORS: true, // Allow cross-origin images if any
        windowWidth: 800, // Force width
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error("Failed to generate blob");
          setIsGenerating(false);
          return;
        }

        const formData = new FormData();
        formData.append("image", blob, "result.png");

        // Upload to Cloudflare Worker
        const WORKER_URL = import.meta.env.VITE_WORKER_URL;
        if (!WORKER_URL) {
          console.error("Worker URL is not defined");
          alert("設定エラー: Worker URLが見つかりません");
          setIsGenerating(false);
          return;
        }

        try {
          const response = await fetch(WORKER_URL, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error("Upload failed");
          }

          const data = await response.json();
          setShareUrl(data.url);
        } catch (error) {
          console.error("Upload error:", error);
          alert("画像のアップロードに失敗しました。");
          setShowQR(false);
        } finally {
          setIsGenerating(false);
        }
      }, 'image/png');

    } catch (error) {
      console.error("Capture error:", error);
      setIsGenerating(false);
      setShowQR(false);
    }
  };

  return (
    <div id="result-chart-container" ref={chartRef} className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500 p-4 bg-white/50 rounded-3xl">



      {/* Header Summary */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-purple-100 text-center">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 mb-4">
          診断結果
        </h2>
        <p className="text-gray-700 text-lg leading-relaxed">
          {result.summary}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Chart Section */}
        <div className="bg-white/90 rounded-3xl shadow-xl p-4 flex flex-col items-center justify-center min-h-[400px]">
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis
                dataKey="label"
                tick={CustomTick}
                style={{ fontSize: '12px' }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Voice Type"
                dataKey="score"
                stroke="#8884d8"
                strokeWidth={2}
                fill="#8b5cf6"
                fillOpacity={0.4}
              />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number, name: string, props: any) => [`${value}点`, props.payload.subLabel]}
              />
            </RadarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2">※グラフは各要素の強さを表しています</p>
        </div>

        {/* Details List Section */}
        <div id="details-list" className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {data.map((param) => (
            <div
              key={param.id}
              className="flex items-start gap-4 bg-white/60 p-4 rounded-xl transition-all hover:bg-white/90 hover:shadow-md"
              style={{ borderLeft: `4px solid ${param.colorCode}` }}
            >
              <div className="flex-shrink-0 w-16 text-center">
                <div className="text-sm font-bold" style={{ color: param.colorCode }}>{param.label}</div>
                <div className="text-2xl font-black text-gray-800">{param.score}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {param.subLabel}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-snug">
                  {param.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>

      <div className="flex justify-center pt-8">
        <button
          onClick={onReset}
          className="px-8 py-3 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors shadow-lg font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          もう一度診断する
        </button>
      </div>

      {/* Share Section */}
      <div className="flex flex-col items-center space-y-4 pt-4 border-t border-gray-200" data-html2canvas-ignore="true">
        <button
          onClick={handleShare}
          className="text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          結果をシェアする
        </button>

        {/* QR Code Modal */}
        {showQR && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowQR(false)}>
            <div
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-lg w-full flex flex-col items-center space-y-6 animate-in zoom-in-95 duration-200 max-h-[95vh] max-w-[95vw] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-800">診断結果をシェア</h3>

              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                  <p className="text-gray-500">画像を生成中...</p>
                </div>
              ) : shareUrl ? (
                <>
                  <div className="bg-white p-2 rounded-xl border-2 border-gray-100 w-full max-w-[420px]">
                    <QRCodeSVG
                      value={shareUrl}
                      size={420}
                      level="L"
                      includeMargin={true}
                      style={{ width: '100%', height: 'auto' }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 text-center">
                    このQRコードを読み取ると<br />診断結果の画像が表示されます
                  </p>
                </>
              ) : (
                <p className="text-red-500">エラーが発生しました</p>
              )}

              <button
                onClick={() => setShowQR(false)}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* Hidden Capture Template */}
      <div id="capture-template" style={{ position: 'absolute', left: '-9999px', top: 0, width: '800px', background: 'white', padding: '40px', borderRadius: '24px' }}>
        {/* Header */}
        <div className="flex flex-col items-center space-y-2 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 relative flex-shrink-0 bg-white rounded-full p-1 shadow-md">
              <img src="/logo.png" alt="エンカレ！ロゴ" className="w-full h-full object-contain rounded-full" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-sky-600">静岡大学放送研究会 Cue-FM 浜松</div>
              <h1 className="text-4xl font-black text-orange-500 font-zen-maru">
                エンカレ！声診断
              </h1>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white p-6 rounded-2xl border border-purple-100 text-center mb-8">
          <h2 className="text-3xl font-bold text-purple-600 mb-4">
            診断結果
          </h2>
          <p className="text-gray-700 text-xl leading-relaxed">
            {result.summary}
          </p>
        </div>

        {/* Chart */}
        <div className="flex justify-center mb-8">
          <div className="w-[500px] h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="label" tick={CustomTick} style={{ fontSize: '14px', fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Voice Type" dataKey="score" stroke="#8884d8" strokeWidth={3} fill="#8b5cf6" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Details Grid (2 Columns) */}
        <div className="grid grid-cols-2 gap-6">
          {data.map((param) => (
            <div key={param.id} className="flex items-start gap-4 bg-gray-50 p-4 rounded-xl border-l-4" style={{ borderLeftColor: param.colorCode }}>
              <div className="flex-shrink-0 w-16 text-center">
                <div className="text-sm font-bold" style={{ color: param.colorCode }}>{param.label}</div>
                <div className="text-3xl font-black text-gray-800">{param.score}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
                    {param.subLabel}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-snug">
                  {param.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResultChart;
