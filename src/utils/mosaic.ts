export interface MosaicPanel {
  index: number;
  label: string;
  raHours: number;
  decDegrees: number;
  xOffsetDegrees: number;
  yOffsetDegrees: number;
}

function valid(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be positive.`);
}

export function mosaicDimensions(
  panelWidthDegrees: number,
  panelHeightDegrees: number,
  columns: number,
  rows: number,
  overlapPercent: number,
) {
  valid(panelWidthDegrees, "Panel width");
  valid(panelHeightDegrees, "Panel height");
  if (!Number.isInteger(columns) || columns < 1 || !Number.isInteger(rows) || rows < 1)
    throw new Error("Rows and columns must be positive whole numbers.");
  if (!Number.isFinite(overlapPercent) || overlapPercent < 0 || overlapPercent >= 100)
    throw new Error("Overlap must be between 0 and 99 percent.");
  const step = 1 - overlapPercent / 100;
  return {
    width: panelWidthDegrees * (1 + (columns - 1) * step),
    height: panelHeightDegrees * (1 + (rows - 1) * step),
  };
}

export function mosaicPanels({
  centerRaHours,
  centerDecDegrees,
  panelWidthDegrees,
  panelHeightDegrees,
  columns,
  rows,
  overlapPercent,
  rotationDegrees = 0,
}: {
  centerRaHours: number;
  centerDecDegrees: number;
  panelWidthDegrees: number;
  panelHeightDegrees: number;
  columns: number;
  rows: number;
  overlapPercent: number;
  rotationDegrees?: number;
}): MosaicPanel[] {
  mosaicDimensions(panelWidthDegrees, panelHeightDegrees, columns, rows, overlapPercent);
  const overlap = 1 - overlapPercent / 100;
  const angle = (rotationDegrees * Math.PI) / 180;
  const cosDec = Math.max(0.08, Math.cos((centerDecDegrees * Math.PI) / 180));
  const result: MosaicPanel[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = (column - (columns - 1) / 2) * panelWidthDegrees * overlap;
      const y = ((rows - 1) / 2 - row) * panelHeightDegrees * overlap;
      const rotatedX = x * Math.cos(angle) - y * Math.sin(angle);
      const rotatedY = x * Math.sin(angle) + y * Math.cos(angle);
      result.push({
        index: result.length + 1,
        label: `P${row + 1}-${column + 1}`,
        raHours: ((centerRaHours + rotatedX / (15 * cosDec)) % 24 + 24) % 24,
        decDegrees: Math.max(-90, Math.min(90, centerDecDegrees + rotatedY)),
        xOffsetDegrees: rotatedX,
        yOffsetDegrees: rotatedY,
      });
    }
  }
  return result;
}
