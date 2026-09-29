import { useRef, useEffect } from "react"

export interface ListPaginationControlsProps {
  currentPage: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
}


/**
 * First/Previous/Next/Last nav plus a jump-to-page input, e.g.:
 *
 *   <ListPaginationControls
 *     currentPage={page} pageSize={PAGE_SIZE} totalItems={count}
 *     onPageChange={(page) => setPage(page)}
 *   />
 *
 * `onPageChange` only fires with an already-validated integer in [1, totalPages] —
 * out-of-range nav clicks no-op, and an invalid page-input entry resets to `currentPage`
 * on Enter. The page input is uncontrolled (synced via ref, not `value`) so typing isn't
 * fought by React on every parent re-render; only committed (Enter) or externally-driven
 * (prop) changes update it.
 */
export function ListPaginationControls( { currentPage, pageSize, totalItems, onPageChange }: ListPaginationControlsProps ) {

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = String(currentPage)
    }
  }, [currentPage])

  const totalPages = Math.ceil(totalItems / pageSize)

  function pageChangeButtonHandler(newPage: number) {
    return function(e: React.MouseEvent<HTMLAnchorElement>) {
      e.preventDefault()
      if(newPage >= 1 && newPage <= totalPages) {
        onPageChange(newPage)
      }
    }
  }

  function inputKeyHandler(e: React.KeyboardEvent<HTMLInputElement>) {
    if(e.key !== "Enter") return
    const newPage = Number(inputRef.current?.value)
    if( Number.isInteger(newPage) && newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage)
    } else if (inputRef.current) {
      inputRef.current.value = String(currentPage)
    }
  }

  return (
    <nav>
      <ul>
        <li><a href="" onClick={pageChangeButtonHandler(1)}>First</a></li>
        <li><a href="" onClick={pageChangeButtonHandler(currentPage - 1)}>Previous</a></li>
        <li>
          <input
            ref={inputRef}
            type="number" min="1" max={totalPages}
            defaultValue={currentPage}
            onKeyUp={inputKeyHandler}
          ></input> out of {totalPages} pages
        </li>
        <li><a href="" onClick={pageChangeButtonHandler(currentPage + 1)}>Next</a></li>
        <li><a href="" onClick={pageChangeButtonHandler(totalPages)}>Last</a></li>
      </ul>
    </nav>
  )
}