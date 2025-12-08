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
import { getShareUrl } from '../utils/share';
import { useState } from 'react';

interface ResultChartProps {
  result: AnalysisResult;
  onReset: () => void;
}

const ResultChart: React.FC<ResultChartProps> = ({ result, onReset }) => {
  const [showQR, setShowQR] = useState(false);
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

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">

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
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
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
      <div className="flex flex-col items-center space-y-4 pt-4 border-t border-gray-200">
        <button
          onClick={() => setShowQR(true)}
          className="text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          結果をシェアする
        </button>

        {/* QR Code Modal */}
        {showQR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowQR(false)}>
            <div
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-lg w-full flex flex-col items-center space-y-6 animate-in zoom-in-95 duration-200 max-h-[95vh] max-w-[95vw] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-800">診断結果をシェア</h3>
              <div className="bg-white p-2 rounded-xl border-2 border-gray-100 w-full max-w-[420px]">
                <QRCodeSVG
                  value={getShareUrl(result)}
                  size={420}
                  level="L"
                  includeMargin={true}
                  style={{ width: '100%', height: 'auto' }}
                />
              </div>
              <p className="text-sm text-gray-500 text-center">
                このQRコードを読み取ると<br />同じ診断結果が表示されます
              </p>
              <button
                onClick={() => setShowQR(false)}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultChart;
