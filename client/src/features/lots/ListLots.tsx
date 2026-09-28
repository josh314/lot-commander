import { Link } from 'react-router'

import { Lot } from '../../lib/Lot'
import * as queries from '../../queries'


function ListLotsTableDataRow( { lot }: { lot: Lot } ) {
  return (
    <tr>
      <td>{lot.id}</td>
      <td><Link to={`/lots/${lot.id}`}>{lot.handle}</Link></td>
      <td>{lot.totalUnits ?? '-'}</td>
      <td>{lot.createdAt?.toLocaleString() ?? '-'}</td>
      <td>{lot.updatedAt?.toLocaleString() ?? '-'}</td>
      <td>{lot.status ?? '-'}</td>
    </tr>
  )
}

function ListLotsTableHeader(  ) {
  return (
    <tr>
      <td>ID</td>
      <td>Handle</td>
      <td>Total Units</td>
      <td>Created</td>
      <td>Updated</td>
      <td>Status</td>
    </tr>
  )
}

function ListLotsTable( { children }: { children: React.ReactNode } ) {
  return (
    <table>
      <thead>
        <ListLotsTableHeader />
      </thead>
      <tbody>
        {children}
      </tbody>
    </table>
  )
}

export function ListLots() {

  const { isPending, error, data } = queries.lots.useList( {
    sort: 'createdAt',
    sort_dir: -1,
  } )

  if(isPending) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div>Error: {error.message}</div>
  }

  const lots: Lot[] = data ?? []

  return (
    <>
      <ListLotsTable>
        {lots.map(lot => (
          <ListLotsTableDataRow key={lot.id} lot={lot} />
        ))}
      </ListLotsTable>
    </>
  )
}