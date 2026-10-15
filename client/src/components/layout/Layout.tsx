import type { ComponentType } from 'react'

const layoutBrand = Symbol('layout')  // module-private brand symbol for Layout interface

// The Component must have an <Outlet /> to be suitable for a layout
export interface Layout {
  readonly [layoutBrand]: true
  Component: ComponentType
}

export function layout(Component: ComponentType): Layout {
  return {
    [layoutBrand]: true,
    Component
  }
}