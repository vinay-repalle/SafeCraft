import type { AnchorHTMLAttributes } from 'react'
import { isPlainLeftClick, useRoute } from './route'

// A link to another page of this site (see route.ts). It is a real <a href>, so it can be
// opened in a new tab, copied and read by screen readers; a plain click just swaps the page
// without a reload.
export function Link({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const navigate = useRoute((s) => s.navigate)
  return (
    <a
      href={href}
      onClick={(e) => {
        onClick?.(e)
        if (!isPlainLeftClick(e)) return
        e.preventDefault()
        navigate(href)
      }}
      {...rest}
    />
  )
}
