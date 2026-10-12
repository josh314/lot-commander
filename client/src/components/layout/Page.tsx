import type { ComponentType } from 'react'

import { PageStack } from './PageStack'

const pageBrand = Symbol('page')  // module-private brand symbol for Page interface

export interface Page {
  readonly [pageBrand]: true
  Component: ComponentType
}

export function page(Component: ComponentType): Page {
  function Wrapped() {
    return <PageStack><Component /></PageStack>
  }
  return {
    [pageBrand]: true,
    Component: Wrapped
  }
}

export function rawPage(Component: ComponentType): Page {
  return {
    [pageBrand]: true,
    Component
  }
}