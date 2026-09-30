import { useState } from 'react'
import { Link } from 'react-router'

import { ListPaginationControls, type ListPaginationControlsProps } from '../../components/ListPaginationControls'
import { Lot } from '../../lib/Lot'
import * as queries from '../../queries'
import { buildLotQueryParams, toLotNumberFilter, type FilterStatusOption, type ListFilters, FILTER_STATUS_OPTIONS } from './list-lots-filters'

// TODO: make PAGE_SIZE configurable
const PAGE_SIZE = 25

function ListHandleFilterInput( { value, onChange }: { value: string, onChange: (value: { handle: string }) => void } ) {
  return (
    <div>
      <label htmlFor="handleFilterInput">Handle</label>
      <input id="handleFilterInput" type="text" placeholder="" value={value} onChange={e => onChange({ handle: e.target.value })} />
    </div>
  )
}

function ListLotNumberFilterInput( { value, onChange }: { value: string, onChange: (value: { lotNumber: string }) => void } ) {

  const _onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if( toLotNumberFilter(e.target.value) === undefined ) {
      return
    }
    onChange({ lotNumber: e.target.value })
  }

  return (
    <div>
      <label htmlFor="lotNumberFilterInput">Lot Number</label>
      <input id="lotNumberFilterInput" type="text" placeholder="" value={value} onChange={_onChange} />
    </div>
  )
}

function ListStatusFilterInput( { value, onChange }: { value: FilterStatusOption, onChange: (value: { status: FilterStatusOption }) => void } ) {
  return (

    <div>
      <label htmlFor="statusFilterInput">Status</label>
      <select id="statusFilterInput" value={value} onChange={e => onChange({ status: e.target.value as FilterStatusOption })}>
        {FILTER_STATUS_OPTIONS.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  )
}

function ListFiltersInput( { filters, onChange }: { filters: ListFilters, onChange: (value: Partial<ListFilters>) => void } ) {
  return (
    <fieldset>
      <legend>Filters</legend>
      <ListHandleFilterInput value={filters.handle} onChange={patch => onChange(patch)} />
      <ListLotNumberFilterInput value={filters.lotNumber} onChange={patch => onChange(patch)} />
      <ListStatusFilterInput value={filters.status} onChange={patch => onChange(patch)} />
    </fieldset>
  )
}

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
  const [ filters, setFilters ] = useState<ListFilters>({
    handle: '',
    lotNumber: '',
    status: 'All',
  })

  const { isPending, error, count, lots } = queries.lots.usePaginatedList( buildLotQueryParams(page, PAGE_SIZE, filters) )

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
      <ListFiltersInput filters={filters} onChange={ (patch: Partial<ListFilters>) => { setFilters( { ...filters, ...patch } ); setPage(1) } } />
      <ListPaginationControls {...pagination} />
      <ListLotsTable>
        {lots.map(lot => (
          <ListLotsTableDataRow key={lot.id} lot={lot} />
        ))}
      </ListLotsTable>
    </>
  )
}