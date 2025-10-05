interface SparklineChartProps {
  data: number[];
  className?: string;
  color?: string;
}

export const SparklineChart = ({ data, className = '', color = 'hsl(var(--primary))' }: SparklineChartProps) => {
  if (!data || data.length === 0) {
    return <div className={`h-8 ${className}`} />;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg
      viewBox="0 0 100 100"
      className={`h-8 w-full ${className}`}
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};
