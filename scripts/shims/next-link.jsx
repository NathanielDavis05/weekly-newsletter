// Stands in for `next/link` when the landing page is rendered to static HTML
// outside Next. The page only ever passes `href` and `className`, and a static
// export has no client router to prefetch into, so a plain anchor is exact.
export default function Link({ href, children, ...rest }) {
  return <a href={href} {...rest}>{children}</a>;
}
