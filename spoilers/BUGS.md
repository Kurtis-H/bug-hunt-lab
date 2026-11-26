# ⚠️ Spoilers: every bug, explained

Stop here if you're still hunting! Each entry gives what the bug does, why it happens in real code, and how a test can catch it.

## Signup form

| ID | What's wrong | Why it happens in real life | How to catch it |
|---|---|---|---|
| SIGNUP-1 | Email check is `/.+@.+/`, so `a@b`, `x@y.c` and `two words@example.com` pass. The server shares the same check. | "Good enough" regexes copied from the internet; client and server sharing one weak rule. | Table of invalid emails; also call the API directly. |
| SIGNUP-2 | Password must be `> 8` instead of `>= 8`, so exactly 8 characters is rejected. | Classic off-by-one. | Boundary-value analysis: test 7, 8 and 9. |
| SIGNUP-3 | Error messages are only ever set, never cleared. A fixed field keeps its old error. | Rendering only the "bad" path. | Make a mistake, fix it, assert the error is gone. |
| SIGNUP-4 | Submit button isn't disabled while the request is in flight. A double-click sends two requests; the second gets a 409 and the user sees an error after their account was created. | Missing in-flight state. | Count network requests on `dblclick()`. |

## Shopping cart

| ID | What's wrong | Why | How to catch it |
|---|---|---|---|
| CART-1 | Tax is truncated (`Math.floor`) instead of rounded: $7.58 instead of $7.59. | Rounding rules nobody wrote down. | Compute the expected total by hand, to the cent. |
| CART-2 | Applying SAVE10 twice stacks the discount (10% of 10%). | No "already applied" state. | Apply the code twice; assert the discount is unchanged. |
| CART-3 | Quantity can go to 0 and negative, producing negative totals. | Missing lower bound. | Click "−" past 1. |
| CART-4 | Remove deletes every item with the same **name**, so removing the M T-shirt removes the L too. | Using a display field as an identifier. | Remove one variant; assert the other remains. |

## Product table

| ID | What's wrong | Why | How to catch it |
|---|---|---|---|
| TABLE-1 | Prices sort as text: $100 comes before $25 and $9.99. | Generic string comparator used for every column. | Sort, then compare against a numeric sort of the same values. |
| TABLE-2 | The API computes `totalPages` with `floor` instead of `ceil`. The last partial page disappears, and so do searches with fewer results than a page. | Off-by-one in pagination maths. | Page through everything and count; compare with `total`. |
| TABLE-3 | Search is case-sensitive: `usb` finds nothing. | Forgetting to normalize case. | Search in lower case for a capitalized name. |
| TABLE-4 | Invalid `page`/`size` (0, -1, `abc`, 1.5, 1000) return **200** with an empty list instead of **400**. | Swallowing bad input instead of rejecting it. | API tests with values the UI never sends. |

## Dates

| ID | What's wrong | Why | How to catch it |
|---|---|---|---|
| DATES-1 | Age is just `thisYear - birthYear`, so it's a year too high before the birthday. | Ignoring month and day. | Birthday later in the year, on the day, the day before. |
| DATES-2 | Adding a month uses `setMonth`, which rolls Jan 31 into **March 3**. | JavaScript `Date` overflow behavior. | Month-end dates, leap years, December to January. |
| DATES-3 | `new Date('2026-03-01')` is parsed as **UTC midnight**, which is still Feb 28 in the Americas, so the page says "February 28". Invisible on UTC machines, including most CI servers. | Date-only ISO strings are UTC; date-time strings are local. | Run the test in several time zones with `test.use({ timezoneId })`. |

## Live search

| ID | What's wrong | Why | How to catch it |
|---|---|---|---|
| SEARCH-1 | Responses are shown in the order they **arrive**, so a slow "ap" response overwrites the newer "apple" results. | No check that a response belongs to the latest request. | Type, pause, type more; wait for the slow response; assert the results still match. |
| SEARCH-2 | No debounce: one request per keystroke. | Wiring `input` straight to `fetch`. | Count requests while typing a word. |
| SEARCH-3 | On a 500 response, the code assumes success, throws, and the spinner spins forever with no message. | Happy-path-only error handling. | Search `error`; assert a message and that the spinner is hidden. |

## Accessibility

| ID | What's wrong | Why | How to catch it |
|---|---|---|---|
| A11Y-1 | "Subscribe" is a `<div>` with a click handler: no keyboard focus, no button role. | Styling a div instead of using `<button>`. | Tab to it and press Enter. |
| A11Y-2 | The email field has only a placeholder, no label. | Placeholders look like labels but disappear on typing and aren't announced reliably. | `getByLabel('Email address')` fails. **Note: axe does not flag this one**, because it accepts a placeholder as a fallback name. Automated scanners are a floor, not a full check. |
| A11Y-3 | The "dialog" is a styled div: focus stays behind it, Escape does nothing, and there's no `role="dialog"`. | Hand-rolled modals. | Open with the keyboard, check focus, press Escape, check focus returns. |
