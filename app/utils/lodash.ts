/**
 * Lodash utilities - re-export commonly used functions for app-wide usage.
 * Use lodash-es for tree-shaking (ESM imports).
 *
 * Usage: import { get, debounce, groupBy } from '~/utils/lodash'
 */

// Array
export {
  chunk,
  compact,
  difference,
  flatten,
  flattenDeep,
  groupBy,
  orderBy,
  partition,
  sortBy,
  take,
  uniq,
  uniqBy,
  without
} from 'lodash-es'

// Collection
export {
  countBy,
  every,
  filter,
  find,
  flatMap,
  forEach,
  includes,
  keyBy,
  map,
  reduce,
  reject,
  size,
  some
} from 'lodash-es'

// Function
export { debounce, memoize, once, throttle } from 'lodash-es'

// Lang
export {
  clone,
  cloneDeep,
  isEmpty,
  isEqual,
  isNil,
  isNumber,
  isObject,
  isString,
  toArray
} from 'lodash-es'

// Math
export { max, maxBy, min, minBy, sum, sumBy } from 'lodash-es'

// Number
export { clamp, inRange, random } from 'lodash-es'

// Object
export {
  assign,
  defaults,
  defaultsDeep,
  get,
  has,
  keys,
  merge,
  omit,
  pick,
  set,
  values
} from 'lodash-es'

// String
export {
  camelCase,
  capitalize,
  kebabCase,
  snakeCase,
  startCase,
  trim,
  truncate,
  upperFirst
} from 'lodash-es'
