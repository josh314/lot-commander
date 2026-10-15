import { useRef, useEffect } from "react"
import { ChevronLeft, ChevronsLeft, ChevronRight, ChevronsRight } from "lucide-react"

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
    <nav className="flex justify-center my-4">
      <ul className="flex gap-2">
        <li><a href="" onClick={pageChangeButtonHandler(1)}><ChevronsLeft /></a></li>
        <li><a href="" onClick={pageChangeButtonHandler(currentPage - 1)}><ChevronLeft /></a></li>
        <li>
          <input
            ref={inputRef}
            className="border rounded px-2 mx-2 text-center no-spinner"
            type="number" min="1" max={totalPages} size={4}
            defaultValue={currentPage}
            onKeyUp={inputKeyHandler}
          ></input>/ {totalPages}
        </li>
        <li><a href="" onClick={pageChangeButtonHandler(currentPage + 1)}><ChevronRight /></a></li>
        <li><a href="" onClick={pageChangeButtonHandler(totalPages)}><ChevronsRight /></a></li>
      </ul>
    </nav>
  )
}