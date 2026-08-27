import { Group, Line, Rect, Text } from 'react-konva';
import type { Design } from '../model/types';

// Paper, boundary, grid, edge rulers — all in world metres, non-interactive.
export function GridLayer({ design }: { design: Design }) {
  const { widthM: W, heightM: H, gridSizeM: g, boundary } = design;
  const minor: number[][] = [];
  for (let x = 0; x <= W + 1e-9; x += g) minor.push([x, 0, x, H]);
  for (let y = 0; y <= H + 1e-9; y += g) minor.push([0, y, W, y]);
  const major: number[][] = [];
  for (let x = 0; x <= W + 1e-9; x += 1) major.push([x, 0, x, H]);
  for (let y = 0; y <= H + 1e-9; y += 1) major.push([0, y, W, y]);

  const labels = [];
  for (let x = 0; x <= W; x += 1) labels.push(<Text key={`x${x}`} x={x - 0.5} y={-0.55} width={1} align="center" text={`${x}`} fontSize={0.28} fill="#9a917f" listening={false} />);
  for (let y = 0; y <= H; y += 1) labels.push(<Text key={`y${y}`} x={-0.72} y={y - 0.14} width={0.6} align="right" text={`${y}`} fontSize={0.28} fill="#9a917f" listening={false} />);

  return (
    <Group listening={false}>
      <Rect x={-1.2} y={-1.2} width={W + 2.4} height={H + 2.4} fill="#efece4" cornerRadius={0.2}
        shadowColor="#00000030" shadowBlur={0.4} shadowOffsetY={0.1} />
      <Line points={boundary} closed fill="#f7f4ec" stroke="transparent" />
      <Group clipFunc={ctx => {
        ctx.beginPath();
        ctx.moveTo(boundary[0], boundary[1]);
        for (let i = 2; i < boundary.length; i += 2) ctx.lineTo(boundary[i], boundary[i + 1]);
        ctx.closePath();
      }}>
        {minor.map((p, i) => <Line key={`m${i}`} points={p} stroke="#ddd6c6" strokeWidth={0.012} />)}
        {major.map((p, i) => <Line key={`M${i}`} points={p} stroke="#cfc6b0" strokeWidth={0.02} />)}
      </Group>
      <Line points={boundary} closed stroke="#4e5a42" strokeWidth={0.07} />
      {labels}
      {/* scale bar */}
      <Group x={0} y={H + 0.55}>
        <Rect x={0} y={0} width={1} height={0.12} fill="#4e5a42" />
        <Rect x={1} y={0} width={1} height={0.12} fill="#fff" stroke="#4e5a42" strokeWidth={0.02} />
        <Text x={-0.1} y={0.2} text="0" fontSize={0.26} fill="#6b6152" />
        <Text x={0.9} y={0.2} text="1" fontSize={0.26} fill="#6b6152" />
        <Text x={1.85} y={0.2} text="2m" fontSize={0.26} fill="#6b6152" />
      </Group>
      {/* north arrow */}
      <Group x={W + 0.7} y={-0.6} rotation={design.northDeg}>
        <Line points={[0, 0.3, 0, -0.3]} stroke="#4e5a42" strokeWidth={0.05} />
        <Line points={[-0.14, -0.1, 0, -0.3, 0.14, -0.1]} closed fill="#4e5a42" />
        <Text x={-0.3} y={0.38} width={0.6} align="center" text="N" fontSize={0.3} fontStyle="bold" fill="#4e5a42" />
      </Group>
    </Group>
  );
}
