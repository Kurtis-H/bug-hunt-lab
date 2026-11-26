// Unit tests for the shared logic, using Node's built-in test runner (no dependencies).
// These run in milliseconds. The e2e suite checks the same rules through the real UI.
//
// Each lib function takes a `bug` predicate, so these tests can also show that every
// bug really changes behavior - the unit-level version of the scorecard.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { changeQty, defaultItems, isDiscountCode, money, removeItem, totals } from '../../public/lib/cart.js';
import { addMonths, ageOn } from '../../public/lib/dates.js';
import { sortRows } from '../../public/lib/table.js';
import { validateSignup } from '../../public/lib/validation.js';

const off = () => false;
const only = (id) => (b) => b === id;

describe('cart', () => {
  test('default totals, to the cent', () => {
    assert.deepEqual(totals(defaultItems(), 0, off), { subtotal: 9197, discount: 0, tax: 759, total: 9956 });
  });

  test('discount applies once', () => {
    assert.equal(totals(defaultItems(), 3, off).total, totals(defaultItems(), 1, off).total);
    assert.notEqual(totals(defaultItems(), 3, only('CART-2')).total, totals(defaultItems(), 1, off).total);
  });

  test('tax rounds to nearest cent', () => {
    assert.equal(totals(defaultItems(), 0, off).tax, 759); // 758.7525
    assert.equal(totals(defaultItems(), 0, only('CART-1')).tax, 758);
  });

  test('quantity floor is 1', () => {
    const items = changeQty(changeQty(defaultItems(), 2, -1, off), 2, -1, off);
    assert.equal(items.find((i) => i.id === 2).qty, 1);
    assert.equal(changeQty(defaultItems(), 2, -1, only('CART-3')).find((i) => i.id === 2).qty, 0);
  });

  test('remove deletes only the chosen variant', () => {
    assert.deepEqual(removeItem(defaultItems(), 2, off).map((i) => i.id), [1, 3]);
    assert.deepEqual(removeItem(defaultItems(), 2, only('CART-4')).map((i) => i.id), [1]);
  });

  test('discount code and money formatting', () => {
    assert.ok(isDiscountCode(' save10 '));
    assert.ok(!isDiscountCode('SAVE100'));
    assert.equal(money(-920), '-$9.20');
    assert.equal(money(5), '$0.05');
  });
});

describe('dates', () => {
  for (const [birth, today, age] of [
    ['2000-12-15', '2026-11-25', 25],
    ['2000-11-25', '2026-11-25', 26],
    ['2008-02-29', '2026-02-28', 17],
  ]) {
    test(`age ${birth} on ${today} = ${age}`, () => assert.equal(ageOn(birth, today, off), age));
  }
  test('age bug ignores whether the birthday has passed', () => {
    assert.equal(ageOn('2000-12-15', '2026-11-25', only('DATES-1')), 26);
  });

  for (const [start, next] of [
    ['2026-01-31', '2026-02-28'],
    ['2028-01-31', '2028-02-29'],
    ['2026-12-31', '2027-01-31'],
    ['2026-03-15', '2026-04-15'],
  ]) {
    test(`renewal ${start} -> ${next}`, () => assert.equal(addMonths(start, 1, off), next));
  }
  test('renewal bug rolls into the following month', () => {
    assert.equal(addMonths('2026-01-31', 1, only('DATES-2')), '2026-03-03');
  });
});

describe('validation', () => {
  const valid = { name: 'Ada', email: 'ada@example.com', password: '12345678', confirm: '12345678', age: '30' };

  test('accepts a valid signup with an 8-character password', () => {
    assert.deepEqual(validateSignup(valid, off), { ok: true, errors: {} });
  });

  for (const email of ['a@b', 'x@y.c', 'two words@example.com', 'no-at.example.com', '']) {
    test(`rejects email "${email}"`, () => assert.ok(validateSignup({ ...valid, email }, off).errors.email));
  }

  for (const age of ['12', '121', '30.5', 'abc', '']) {
    test(`rejects age "${age}"`, () => assert.ok(validateSignup({ ...valid, age }, off).errors.age));
  }

  test('password boundary bug rejects exactly 8 characters', () => {
    assert.ok(validateSignup(valid, only('SIGNUP-2')).errors.password);
  });
});

describe('table sorting', () => {
  const rows = [{ price: 9.99 }, { price: 100 }, { price: 25 }];
  test('numbers sort numerically', () => {
    assert.deepEqual(sortRows(rows, 'price', 'asc', off).map((r) => r.price), [9.99, 25, 100]);
    assert.deepEqual(sortRows(rows, 'price', 'desc', off).map((r) => r.price), [100, 25, 9.99]);
  });
  test('sort bug compares numbers as text', () => {
    assert.deepEqual(sortRows(rows, 'price', 'asc', only('TABLE-1')).map((r) => r.price), [100, 25, 9.99]);
  });
  test('does not mutate the input', () => {
    const copy = structuredClone(rows);
    sortRows(rows, 'price', 'asc', off);
    assert.deepEqual(rows, copy);
  });
});
