import { useState } from 'react'
import { Link } from 'react-router'

import { ListPaginationControls, type ListPaginationControlsProps } from '../../components/ListPaginationControls'
import { Lot } from '../../lib/Lot'
import * as queries from '../../queries'

// TODO: make PAGE_SIZE configurable
const PAGE_SIZE = 25

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
  const [ page, setPage ] = useState(1)

  const { isPending, error, count, lots } = queries.lots.usePaginatedList( {
    page,
    num: PAGE_SIZE,
    sort: 'createdAt',
    sort_dir: -1,
  } )

  if(isPending) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div>Error: {error.message}</div>
  }

  const pagination: ListPaginationControlsProps = {
    currentPage: page,
    pageSize: PAGE_SIZE,
    totalItems: count,
    onPageChange: (page: number) => {
      console.log('Page changed to:', page)
      setPage(page)
    }
  }

  return (
    <>
      <ListPaginationControls {...pagination} />
      <ListLotsTable>
        {lots.map(lot => (
          <ListLotsTableDataRow key={lot.id} lot={lot} />
        ))}
      </ListLotsTable>
    </>
  )
}