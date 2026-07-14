export type PerformanceTier =
  | 'full'
  | 'logo-reduced'
  | 'ambient-reduced'
  | 'css-reduced'
  | 'motion-reduced'
  | 'webgl-reduced'
  | 'minimal';

export type PerformanceReason = 'reduced-motion' | 'save-data' | 'runtime-fps' | null;

export interface AdaptivePerformanceState {
  performanceTier: PerformanceTier;
  performanceReason: PerformanceReason;
  allowLogoEffects: boolean;
  allowAmbientWebGL: boolean;
  allowInteractiveWebGL: boolean;
  allowHeavyCssEffects: boolean;
  allowCustomCursor: boolean;
  allowDecorativeMotion: boolean;
}
