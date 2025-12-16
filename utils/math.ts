// Box-Muller transform for Normal distribution
export const randomNormal = (mean: number, stdDev: number): number => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.max(0, mean + z * stdDev); // Clamp to 0
};

// Triangular distribution
export const randomTriangular = (min: number, mode: number, max: number): number => {
  const u = Math.random();
  const f = (mode - min) / (max - min);
  if (u < f) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  } else {
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }
};

// Exponential distribution for arrival intervals
export const randomExponential = (rate: number): number => {
  return -Math.log(1 - Math.random()) / rate;
};