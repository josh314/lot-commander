import { useState } from 'react'
import { Link } from 'react-router'

import { FieldSet, Input, Select } from '../../components/ui/Form'
import { ListPaginationControls, type ListPaginationControlsProps } from '../../components/ListPaginationControls'
import { Lot } from '../../lib/Lot'
import * as queries from '../../queries'
import { buildLotQueryParams, toLotNumberFilter, type FilterStatusOption, type ListFilters, FILTER_STATUS_OPTIONS } from './list-lots-filters'
import { useDebouncedValue } from '../../hooks'

import { PageHeader, Surface, Table, TableRow, TableHeader } from '../../components/ui/'

const PAGE_SIZE = 25

function ListHandleFilterInput( { value, onChange }: { value: string, onChange: (value: { handle: string }) => void } ) {
  return (
    <Input label="Handle" value={value} onChange={e => onChange({ handle: e.target.value })} />
  )
}

function ListLotNumberFilterInput( { value, onChange }: { value: string, onChange: (value: { lotNumber: string }) => void } ) {

  const _onChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    if( e.target.value !== '' && toLotNumberFilter(e.target.value) === undefined ) {
      return
    }
    onChange({ lotNumber: e.target.value })
  }

  return (
    <Input label="Lot Number" value={value} onChange={_onChange} />
  )
}

function ListStatusFilterInput( { value, onChange }: { value: FilterStatusOption, onChange: (value: { status: FilterStatusOption }) => void } ) {
  return (

    <Select label="Status" value={value} onChange={e => onChange({ status: e.target.value as FilterStatusOption })}>
      {FILTER_STATUS_OPTIONS.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </Select>

  )
}

function ListFiltersInput( { filters, onChange }: { filters: ListFilters, onChange: (value: Partial<ListFilters>) => void } ) {
  return (
    <Surface>
      <FieldSet legend="Filters">
        <div className="grid grid-cols-3 gap-6">
          <ListHandleFilterInput value={filters.handle} onChange={patch => onChange(patch)} />
          <ListLotNumberFilterInput value={filters.lotNumber} onChange={patch => onChange(patch)} />
          <ListStatusFilterInput value={filters.status} onChange={patch => onChange(patch)} />
        </div>
      </FieldSet>
    </Surface>
  )
}

function ListLotsTableDataRow( { lot, index }: { lot: Lot, index: number } ) {

  const cells = [
    index + 1,
    <Link to={`/lots/${lot.id}`}>{lot.handle}</Link>,
    lot.totalUnits ?? '-',
    lot.createdAt?.toLocaleString() ?? '-',
    lot.updatedAt?.toLocaleString() ?? '-',
    lot.status ?? '-'
  ];
  return <TableRow cells={cells} />

}

function ListLotsTableHeader(  ) {

  const headerCells = ["", "Handle", "Total Units", "Created", "Updated", "Status"]
  return <TableHeader cells={headerCells} />

}

function ListLotsTable( { lots }: { lots: Lot[] } ) {

  const rows = lots.map((lot, index) => (
    <ListLotsTableDataRow key={lot.id} lot={lot} index={index} />
  ))

  return (
    <Surface>
      <Table header={<ListLotsTableHeader />} rows={rows}/>
    </Surface>
  )
}

export function ListLots() {
  const [ page, setPage ] = useState(1)
  const [ filters, setFilters ] = useState<ListFilters>({
    handle: '',
    lotNumber: '',
    status: 'All',
  })

  const debouncedFilters = useDebouncedValue({ handle: filters.handle, lotNumber: filters.lotNumber }, 300)
  const { isPending, error, count, lots } = queries.lots.usePaginatedList( buildLotQueryParams(page, PAGE_SIZE, { ...debouncedFilters, status: filters.status }) )

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
      <PageHeader title="Lots" />
      <div className="flex flex-col items-center">
        <ListFiltersInput filters={filters} onChange={ (patch: Partial<ListFilters>) => { setFilters( { ...filters, ...patch } ); setPage(1) } } />
        <ListPaginationControls {...pagination} />
        <ListLotsTable lots={lots} />
      </div>
    </>
  )
}