/**
 * On-screen keyboards shrink the visual viewport but not the layout one, so a
 * full-height app keeps its bottom edge (the key row, Run tests) behind the
 * keyboard. Publishing the visual viewport's size and offset lets CSS pin the
 * app to the part of the screen that is actually visible.
 */
export function trackVisualViewport() {
  const vv = window.visualViewport
  if (!vv) return
  const root = document.documentElement.style

  const update = () => {
    // Pinch zoom shrinks the visual viewport too; following it would undo the zoom.
    if (vv.scale > 1.01) return
    root.setProperty('--vv-height', `${vv.height}px`)
    root.setProperty('--vv-top', `${vv.offsetTop}px`)
  }

  update()
  vv.addEventListener('resize', update)
  vv.addEventListener('scroll', update)
}
