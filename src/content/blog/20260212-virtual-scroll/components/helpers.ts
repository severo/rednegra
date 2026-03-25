// format values as pixels, hiding sub-pixel values for simplicity
export function px(value: number) {
  return `${value.toFixed(0)}px`;
}

export function row(value: number) {
  return `row ${value}`;
}

export function cn(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}
