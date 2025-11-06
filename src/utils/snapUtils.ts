import { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { IDrawingPoint } from '@/store/drawingStore';

export const snapToPrice = (
  coordinate: number,
  chart: IChartApi,
  series: ISeriesApi<"Candlestick">,
  snapEnabled: boolean = true
): number => {
  if (!snapEnabled) return coordinate;
  
  try {
    const priceScale = chart.priceScale('right');
    // Use logical coordinate conversion
    const price = series.coordinateToPrice(coordinate);
    
    // Snap to nearest 0.01
    const step = 0.01;
    return Math.round(price / step) * step;
  } catch (error) {
    console.warn('Price snap failed:', error);
    return coordinate;
  }
};

export const snapToTime = (
  coordinate: number,
  chart: IChartApi,
  snapEnabled: boolean = true
): number => {
  if (!snapEnabled) return coordinate;
  
  try {
    const timeScale = chart.timeScale();
    const time = timeScale.coordinateToLogical(coordinate);
    
    // Snap to nearest bar
    return Math.round(time || 0);
  } catch (error) {
    console.warn('Time snap failed:', error);
    return coordinate;
  }
};

export const coordinateToPoint = (
  x: number,
  y: number,
  chart: IChartApi,
  series: ISeriesApi<"Candlestick">
): IDrawingPoint => {
  try {
    const timeScale = chart.timeScale();
    
    const time = timeScale.coordinateToLogical(x) || 0;
    const price = series.coordinateToPrice(y);
    
    return { time, price, x, y };
  } catch (error) {
    console.error('Coordinate conversion failed:', error);
    return { time: 0, price: 0, x, y };
  }
};

export const pointToCoordinate = (
  point: IDrawingPoint,
  chart: IChartApi,
  series: ISeriesApi<"Candlestick">
): { x: number; y: number } => {
  try {
    const timeScale = chart.timeScale();
    
    const x = timeScale.logicalToCoordinate(point.time as unknown) || 0;
    const y = series.priceToCoordinate(point.price);
    
    return { x, y };
  } catch (error) {
    console.error('Point conversion failed:', error);
    return { x: point.x || 0, y: point.y || 0 };
  }
};
