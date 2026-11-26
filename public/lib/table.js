// Client-side table sorting.

export function sortRows(rows, key, direction = 'asc', bug = () => false) {
  const dir = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const x = a[key];
    const y = b[key];
    if (typeof x === 'number' && typeof y === 'number' && !bug('TABLE-1')) return (x - y) * dir;
    return String(x).localeCompare(String(y)) * dir; // '100' < '25' < '9' as text
  });
}
