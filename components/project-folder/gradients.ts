export const gradients = [
  "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)", // Blue to Purple
  "linear-gradient(135deg, #EF4444 0%, #F59E0B 100%)", // Red to Orange
  "linear-gradient(135deg, #10B981 0%, #3B82F6 100%)", // Green to Blue
  "linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)", // Pink to Purple
  "linear-gradient(135deg, #6366F1 0%, #EC4899 100%)", // Indigo to Pink
  "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)", // Orange to Red
  "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)", // Purple to Blue
  "linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)", // Cyan to Blue
]

export const solidColors = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#EC4899", // Pink
  "#6366F1", // Indigo
  "#F59E0B", // Orange
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
]

export function getProjectGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

export function getProjectColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % solidColors.length;
  return solidColors[index];
}
