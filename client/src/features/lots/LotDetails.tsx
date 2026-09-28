import { useParams } from 'react-router'

import * as queries from '../../queries'



export function LotDetails() {

  const { id } = useParams()
  const { isPending, error, data: lot } = queries.lots.useGet(id!)

  if(isPending) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div>Error: {error.message}</div>
  }

  return (
    <>
      <div>Lot Details</div>
      <div>ID: {lot?.id}</div>
      <div>Handle: {lot?.handle}</div>
      <div>Total Units: {lot?.totalUnits ?? '-'}</div>
      <div>Created At: {lot?.createdAt?.toLocaleString() ?? '-'}</div>
      <div>Updated At: {lot?.updatedAt?.toLocaleString() ?? '-'}</div>
      <div>Status: {lot?.status ?? '-'}</div>
    </>
  )
}