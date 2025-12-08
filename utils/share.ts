import LZString from 'lz-string';
import { AnalysisResult } from '../types';

export const compressResult = (result: AnalysisResult): string => {
  const jsonString = JSON.stringify(result);
  return LZString.compressToEncodedURIComponent(jsonString);
};

export const decompressResult = (compressed: string): AnalysisResult | null => {
  try {
    const jsonString = LZString.decompressFromEncodedURIComponent(compressed);
    if (!jsonString) return null;
    return JSON.parse(jsonString) as AnalysisResult;
  } catch (e) {
    console.error("Failed to decompress result", e);
    return null;
  }
};

export const getShareUrl = (result: AnalysisResult): string => {
  const compressed = compressResult(result);
  const url = new URL(window.location.href);
  url.searchParams.set('data', compressed);
  return url.toString();
};
