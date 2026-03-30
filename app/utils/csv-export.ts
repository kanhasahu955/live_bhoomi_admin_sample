function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Trigger a browser download of a CSV file (client-only). */
export function downloadCsv(filename: string, lines: string[]): void {
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function breakdownLines(title: string, rows: { name: string; value: number }[]): string[] {
  const out: string[] = [title, 'Name,Count']
  for (const r of rows) {
    out.push(`${escapeCsvCell(String(r.name))},${r.value}`)
  }
  return out
}
