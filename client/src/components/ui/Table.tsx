export function Table({ header, rows }: { header?: React.ReactNode; rows?: React.ReactNode }) {
  return (
    <table>
      {header}
      <tbody className="[&_tr:nth-child(odd)]:bg-surface [&_tr:nth-child(even)]:bg-paper">
        {rows}
      </tbody>
    </table>
  )
}

export function TableRow( { cells }: { cells?: React.ReactNode[] } ) {
  return (
    <tr>
      {cells?.map((cell, index) => (
        <TableCell key={index}>{cell}</TableCell>
      ))}
    </tr>
  )
}

const cellPaddingClass="px-4 py-2"

export function TableCell( { children }: { children: React.ReactNode } ) {
  return (
    <td className={`${cellPaddingClass}`}>{children}</td>
  )
}

export function TableHeader({ cells }: { cells?: React.ReactNode[] }) {
  return (
    <thead>
      <tr>
        {cells?.map((cell, index) => (
          <th key={index} className={`${cellPaddingClass}`}>{cell}</th>
        ))}
      </tr>
    </thead>
  )
}