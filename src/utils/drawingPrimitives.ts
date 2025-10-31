import { LineStyle } from 'lightweight-charts';
import { IDrawing, IDrawingPoint, IDrawingOptions } from '@/store/drawingStore';

const DEFAULT_OPTIONS: IDrawingOptions = {
  color: '#3b82f6',
  lineWidth: 2,
  lineStyle: LineStyle.Solid,
  draggable: true,
  snapToPrice: true,
  showPercent: true,
  showBars: true,
  showVolume: true,
};

export const createTrendLineDrawing = (
  start: IDrawingPoint,
  end: IDrawingPoint,
  customOptions?: Partial<IDrawingOptions>
): IDrawing => {
  return {
    id: `trendline-${Date.now()}`,
    type: 'trendline',
    points: [start, end],
    options: { ...DEFAULT_OPTIONS, ...customOptions },
    visible: true,
    selected: false,
  };
};

export const createHorizontalLineDrawing = (
  point: IDrawingPoint,
  customOptions?: Partial<IDrawingOptions>
): IDrawing => {
  return {
    id: `horizontal-${Date.now()}`,
    type: 'horizontal',
    points: [point],
    options: { ...DEFAULT_OPTIONS, ...customOptions },
    visible: true,
    selected: false,
  };
};

export const createVerticalDrawing = (
  pointStart: IDrawingPoint,
  pointEnd?: IDrawingPoint,
  customOptions?: Partial<IDrawingOptions>
): IDrawing => {
  // For vertical we store a single point (time/x). Keep the first point's time/price
  return {
    id: `vertical-${Date.now()}`,
    type: 'vertical',
    points: [pointStart],
    options: { ...DEFAULT_OPTIONS, ...customOptions },
    visible: true,
    selected: false,
  };
};

export const createRulerDrawing = (
  start: IDrawingPoint,
  end: IDrawingPoint,
  customOptions?: Partial<IDrawingOptions>
): IDrawing => {
  return {
    id: `ruler-${Date.now()}`,
    type: 'ruler',
    points: [start, end],
    options: { 
      ...DEFAULT_OPTIONS, 
      color: '#22c55e',
      showPercent: true,
      showBars: true,
      showVolume: true,
      ...customOptions 
    },
    visible: true,
    selected: false,
  };
};

export const createFibonacciDrawing = (
  start: IDrawingPoint,
  end: IDrawingPoint,
  customOptions?: Partial<IDrawingOptions>
): IDrawing => {
  return {
    id: `fibonacci-${Date.now()}`,
    type: 'fibonacci',
    points: [start, end],
    options: { 
      ...DEFAULT_OPTIONS, 
      color: '#f59e0b',
      levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
      ...customOptions 
    },
    visible: true,
    selected: false,
  };
};

export const createRectangleDrawing = (
  start: IDrawingPoint,
  end: IDrawingPoint,
  customOptions?: Partial<IDrawingOptions>
): IDrawing => {
  return {
    id: `rectangle-${Date.now()}`,
    type: 'rectangle',
    points: [start, end],
    options: { 
      ...DEFAULT_OPTIONS, 
      fillColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: '#3b82f6',
      ...customOptions 
    },
    visible: true,
    selected: false,
  };
};

export const createCircleDrawing = (
  center: IDrawingPoint,
  edge: IDrawingPoint,
  customOptions?: Partial<IDrawingOptions>
): IDrawing => {
  return {
    id: `circle-${Date.now()}`,
    type: 'circle',
    points: [center, edge],
    options: { 
      ...DEFAULT_OPTIONS, 
      fillColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: '#3b82f6',
      ...customOptions 
    },
    visible: true,
    selected: false,
  };
};

export const createTextDrawing = (
  point: IDrawingPoint,
  text: string = 'New Note',
  customOptions?: Partial<IDrawingOptions>
): IDrawing => {
  return {
    id: `text-${Date.now()}`,
    type: 'text',
    points: [point],
    options: { 
      ...DEFAULT_OPTIONS, 
      color: '#ffffff',
      text,
      ...customOptions 
    },
    visible: true,
    selected: false,
  };
};

export const createDrawDrawing = (
  points: IDrawingPoint[],
  customOptions?: Partial<IDrawingOptions>
): IDrawing => {
  return {
    id: `draw-${Date.now()}`,
    type: 'draw',
    points: points,
    options: {
      ...DEFAULT_OPTIONS,
      lineWidth: 2,
      color: '#3b82f6',
      ...customOptions,
    },
    visible: true,
    selected: false,
  };
};

// Calculate measurements for ruler tool
export const calculateMeasurements = (start: IDrawingPoint, end: IDrawingPoint, timeframe: string = '1D') => {
  const priceDiff = end.price - start.price;
  const percentChange = ((priceDiff / start.price) * 100);
  const timeDiff = Math.abs(end.time - start.time);
  
  // Convert time difference to bars based on timeframe
  const timeframeSeconds: Record<string, number> = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '30m': 1800,
    '1H': 3600,
    '4H': 14400,
    '1D': 86400,
    '1W': 604800,
  };
  
  const bars = Math.round(timeDiff / (timeframeSeconds[timeframe] || 86400));
  
  return {
    price: priceDiff,
    percent: percentChange,
    bars,
    time: timeDiff,
  };
};
