import '@testing-library/jest-dom'

if (!HTMLFormElement.prototype.requestSubmit) {
  HTMLFormElement.prototype.requestSubmit = function requestSubmit() {
    this.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  }
}

HTMLAnchorElement.prototype.click = function click() {
  return undefined
}

document.addEventListener(
  'click',
  (event) => {
    const target = event.target
    if (target instanceof Element && target.closest('a[href]')) {
      event.preventDefault()
    }
  },
  true,
)
