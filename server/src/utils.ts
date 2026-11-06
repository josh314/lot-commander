import * as api from '@shared/api'

export function buildMongoListQuery( qp: api.RequestListQueryParams ) {

  const { num, page, sort, sortDir, ...rest } = qp
  const filterParams = { ...rest }

  const _num = num ?? 20
  const skip = ((page ?? 1) - 1) * _num

  let sortField
  if ( sort ) {
    sortField = sort
  }
  else {
    sortField = 'createdAt'
  }

  const sortParams = {
    [ sortField ] : sortDir || 1
  }

  return { skip, num: _num, sortParams, filterParams }

}
