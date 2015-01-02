(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// The way this works is that this file requires others which are collected
// into a single "kmptool.js" file. This file itself is not loaded by the
// browser. Thus, within the definition of those other modules they need
// to properly setup whatever the browser is expecting.

require("logger");

require("./app");
require("./controllers/start");
require("./controllers/project-list");
require("./controllers/top-bar");
},{"./app":12,"./controllers/project-list":13,"./controllers/start":14,"./controllers/top-bar":15,"logger":19}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Find the length
  var length
  if (type === 'number')
    length = subject > 0 ? subject >>> 0 : 0
  else if (type === 'string') {
    if (encoding === 'base64')
      subject = base64clean(subject)
    length = Buffer.byteLength(subject, encoding)
  } else if (type === 'object' && subject !== null) { // assume object is array-like
    if (subject.type === 'Buffer' && isArray(subject.data))
      subject = subject.data
    length = +subject.length > 0 ? Math.floor(+subject.length) : 0
  } else
    throw new TypeError('must start with number, buffer, array or string')

  if (this.length > kMaxLength)
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
      'size: 0x' + kMaxLength.toString(16) + ' bytes')

  var buf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer.TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++)
        buf[i] = subject.readUInt8(i)
    } else {
      for (i = 0; i < length; i++)
        buf[i] = ((subject[i] % 256) + 256) % 256
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer.TYPED_ARRAY_SUPPORT && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

Buffer.isBuffer = function (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b))
    throw new TypeError('Arguments must be Buffers')

  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) throw new TypeError('Usage: Buffer.concat(list[, length])')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    case 'hex':
      ret = str.length >>> 1
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    default:
      ret = str.length
  }
  return ret
}

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function (encoding, start, end) {
  var loweredCase = false

  start = start >>> 0
  end = end === undefined || end === Infinity ? this.length : end >>> 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase)
          throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function (b) {
  if(!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max)
      str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b)
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(byte)) throw new Error('Invalid hex string')
    buf[offset + i] = byte
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string), buf, offset, length, 2)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new TypeError('Unknown encoding: ' + encoding)
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function binarySlice (buf, start, end) {
  return asciiSlice(buf, start, end)
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len;
    if (start < 0)
      start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0)
      end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start)
    end = start

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0)
    throw new RangeError('offset is not uint')
  if (offset + ext > length)
    throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
      ((this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      this[offset + 3])
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80))
    return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16) |
      (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
      (this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      (this[offset + 3])
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new TypeError('value is out of bounds')
  if (offset + ext > buf.length) throw new TypeError('index out of range')
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new TypeError('value is out of bounds')
  if (offset + ext > buf.length) throw new TypeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  if (end < start) throw new TypeError('sourceEnd < sourceStart')
  if (target_start < 0 || target_start >= target.length)
    throw new TypeError('targetStart out of bounds')
  if (start < 0 || start >= source.length) throw new TypeError('sourceStart out of bounds')
  if (end < 0 || end > source.length) throw new TypeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new TypeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new TypeError('start out of bounds')
  if (end < 0 || end > this.length) throw new TypeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F) {
      byteArray.push(b)
    } else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++) {
        byteArray.push(parseInt(h[j], 16))
      }
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length, unitSize) {
  if (unitSize) length -= length % unitSize;
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":4,"ieee754":5,"is-array":6}],4:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],5:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],6:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],7:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],8:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":9}],9:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],10:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],11:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":10,"_process":9,"inherits":7}],12:[function(require,module,exports){
var Logger = require("logger");
var LoggerRingBuffer = require("logger-ring-buffer");
var ringBuffer = new LoggerRingBuffer({
    size: 50
});
// var StackTrace = require("stacktrace");

var ClientUtils = require("client-utils");
var DocCookies = require("doc-cookies");

Logger.DO_COLOR = false;

// Enable all semantic-ui dropdowns
$('.ui.dropdown').dropdown();


// // Monkey patch the string object
// /**
//  * @see http://stackoverflow.com/q/7616461/940217
//  * @return {number}
//  */
// String.prototype.hashCode = function(){
//     if (Array.prototype.reduce){
//         return this.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);              
//     } 
//     var hash = 0;
//     if (this.length === 0) return hash;
//     for (var i = 0; i < this.length; i++) {
//         var character  = this.charCodeAt(i);
//         hash  = ((hash<<5)-hash)+character;
//         hash = hash & hash; // Convert to 32bit integer
//     }
//     return hash;
// }



// Pollute the global namespace with our angular app. Kinda lame, but is what it is.
// This file is all about the global sort of things, by which I mostly mean the global
// service.
kmptoolApp = angular.module("kmptoolApp", [
    "ngRoute", "ngAnimate", "ngSanitize"
    ])
    .config([ "$provide", "$routeProvider", "$filterProvider", function($provide, $routeProvider, $filterProvider) {

        // An exception handler that is more better. Have to use the injector directly so we don't loop
        // on ourself
        $provide.decorator("$exceptionHandler", ["$delegate", "$injector", function($delegate, $injector) {
            return function(exception, cause) {
                var kmpSvc = $injector.get("kmpSvc");
                kmpSvc.showException(exception, cause);
                $delegate(exception, cause);
            }
        }]);


        $routeProvider.when('/start', {
            templateUrl : 'html/start.html'
            , controller : "StartCtrl"

        }).when('/projectList', {
            templateUrl : 'html/project-list.html'
            , controller : "ProjectListCtrl"

        }).otherwise({
            redirectTo : '/start'
        });


        // $filterProvider.register("mpFormattedDate", function() {
        //     return function(num) {
        //         return moment(num).format("MMM Do YYYY, h:mm a");                
        //     }
        // });

        // $filterProvider.register("mpPrioritySorted", function() {
        //     return function(list) {
        //         if (Array.isArray(list)) {
        //             var ar = list.slice(0);
        //         } else {
        //             // Assume a hash
        //             var ar = [];
        //             for(var ix in list) {
        //                 if (ix == "_id" || ix == "_priority") continue;
        //                 ar.push(list[ix]);
        //             }
        //         }

        //         ar.sort(function(a,b) {
        //             var pA = a ? (a._priority || 0) : 0;
        //             var pB = b ? (b._priority || 0) : 0;
        //             return pA - pB;
        //         });

        //         return ar;
        //     }
        // });

        // $filterProvider.register("mpKeysOnly", function() {
        //     return function(obj) {
        //         var list = [];
        //         for (var id in obj) {
        //             if (typeof id == "string" && id[0]=="_") continue;
        //             list.push(id);
        //         }
        //         return list;
        //     }
        // });

        // $filterProvider.register("mpHasField", function() {
        //     return function(input, fieldName) {
        //         var out = [];
        //         for (var id in input) {
        //             if (typeof id == "string" && id[0]=="_") continue;
        //             var obj = input[id];
        //             if (obj[fieldName]) {
        //                 out.push(obj);
        //             }
        //         }
        //         return out;
        //     }
        // });


    } ])

    // --------------------------------------------------------------------------------------------------
    //   A central service for the app

    .factory('kmpSvc', 
        ["$animate", "$rootScope", "$location", "$timeout", "$http", "$route", "$injector"
        , function($animate, $rootScope, $location, $timeout, $http, $route, $injector) {

        // Used to handle automatic reloads more quietly
        var ignoreRouteChangeError = false;

        Logger.info("kmpSvc factory");


        function showMessage(msg, isError) {
            $timeout(function() {
                Logger.debugi("Showing message ", msg);            
                $rootScope.gGeneralMessage = msg;

                $(".general.message").sidebar("show");
                if (isError) {
                    $(".general.message .message").addClass("red");
                } else {
                    $(".general.message .message").removeClass("red");                
                }
                setTimeout(function() {
                    $(".general.message").sidebar("hide");
                }, 3000);
            });
        }

        function showError(err) {
            if (!err) return false;

            Logger.errori(err);

            var text = err.message || err.toString();
            showMessage(text, true);

            return true;
        }

        ///////////////////////////////////////////////////////////////
        function localSet(key, value) {
            if (localStorage) {
                localStorage.setItem(key, value);
            } else {
                DocCookies.setItem(key, value, Infinity);
            }
        }

        function localGet(key) {
            if (localStorage) {
                return localStorage.getItem(key);
            } else {
                return DocCookies.getItem(key);
            }
        }
        
        ///////////////////////////////////////////////////////////////
        function getAgent() {
            if (!navigator) {
                return "no-navigator";
            }
            if (!navigator.userAgent) {
                return "no-user-agent";
            }
            return navigator.userAgent;
        }

        function getFingerprint() {
            var fp = localGet("finger");
            if (fp) return fp;

            // Have to make it
            fp = ClientUtils.uuid();
            localSet("finger", fp);
            return fp;
        }

        function _reportException(ex, x) {
            try {
                var trace = null
                try {
                    trace = StackTrace({e:ex});
                } catch (e) {
                    // ignore
                }

                var report = {
                    msg: x.headline
                    , cause: x.cause
                    , log: ringBuffer.copyContent()
                    , uuid: x.uuid
                    , trace: trace                 
                };
                if (mixpanel && mixpanel.get_distinct_id) {
                    report.mixpanel = mixpanel.get_distinct_id();
                }
                report.agent = getAgent();
                report.fingerprint = getFingerprint();

                // Don't care about success or fail
                // api("/log/exception", report);
            } catch (e) {
                // Ignore...
            }
        }

        var reportException = _.throttle(_reportException, 500, {leading:true, trailing:true});

        function showException(ex, cause) {

            var exObj = {
                headline: ex.message
                , cause: cause
                , uuid: ClientUtils.uuid()
            }
            if (!$rootScope.gExceptions) {
                $rootScope.gExceptions = [];
            }
            
            var x = {
                uuid: exObj.uuid
            }
            if (exObj.headline && exObj.headline.toString) {
                x.headline = exObj.headline.toString();
            }
            if (exObj.cause && exObj.cause.toString) {
                x.cause = exObj.cause.toString();
            }
            aTrack("error.guru.meditation", x);

            $timeout(function() {
                $rootScope.gExceptions.push(exObj);
            });

            reportException(ex, x);         
        }
        dbgShowException = showException;

        $rootScope.removeException = function(ex) {
            if ($rootScope.gExceptions) {
                var ix = $rootScope.gExceptions.indexOf(ex);
                $rootScope.gExceptions.splice(ix, 1);
            }
        }

        $rootScope.$on("$routeChangeSuccess", function(err) {
            aTrack("route.change.success", {
                controller: $route.current.controller
                , path: $location.path()
            })
        });

        $rootScope.$on("$routeChangeError", function(evt, err) {
            if (ignoreRouteChangeError) return;
            Logger.errori(err);
            showException(new Error("Error communicating with the server.", "$routeChangeError"));
        });





        /////////////////////////////////////////////////////////////////////////////////////
        //
        // Analytics

        function aTrack(name, props) {
            // Standardize names???

            Logger.debug("Analytics Event [",name,"] = ", JSON.stringify(props));

            // Tell Mixpanel
            // mixpanel.track("mp."+name, props);
        }

        // function aUserId(id, justCreated) {
        //     if (justCreated) {
        //         mixpanel.alias(id);
        //     } else {
        //         mixpanel.identify(id);
        //     }

        //     // Also set a super parameter
        //     if (justCreated) {
        //         mixpanel.register("userJustCreated", true);
        //     } else {
        //         mixpanel.unregister("userJustCreated");
        //     }

        // }

        // function aUserInfo(info) {
        //     var forMix = {};
        //     if (info.name) {
        //         forMix.name = info.name;
        //     }
        //     if (info.email) {
        //         forMix.$email = info.email;
        //     }

        //     mixpanel.people.set(forMix);
        // }


        /////////////////////////////////////////////////////////////////////////////////////
        //
        // Return the public functions

        return {
            showMessage: showMessage
            , showError: showError
            , showException: showException

            , aTrack: aTrack
            // Don't expose the other analytics things because they all happen inside here
        }
    }])

    // Needed to make modals go away properly
    .directive("kmpRemoveOnScopeDeath", function() {
        return function($scope, element, attrs) {

            Logger.infoi("Remove on scope death init");

            $scope.$on("$destroy", function() {
                Logger.infoi(" -- mpRemoveOnScopeDeath -- ")
                element.remove();
            });
        }
    })

    .directive("kmpEnableDropdown", function() {
        return function($scope, element, attrs) {
            var options = $scope.$eval(attrs.mpEnableDropdown);            
            element.dropdown(options);
        }
    })

    .directive("kmpAddToScope", function() {
        return function($scope, element, attrs) {
            // Logger.errori("Add to scope as ", attrs.mpAddToScope);
            $scope[attrs.mpAddToScope] = element;
        }
    })

    .directive("kmpAddToParentScope", function() {
        return function($scope, element, attrs) {
            // Logger.infoi("Add to parent scope as ", attrs.mpAddToScope);
            $scope.$parent[attrs.mpAddToScope] = element;
        }
    })




    // --------------------------------------------------------------------------------------------------
    //   The most basic of the controllers. Not sure this is really used, but let's say that it is....

    .controller("AppCtrl", ["$scope", function($scope) {

        $scope.globalLoadingCount = 0;

    }])


    .constant('keyCodes', {
        esc: 27,
        space: 32,
        enter: 13,
        tab: 9,
        backspace: 8,
        shift: 16,
        ctrl: 17,
        alt: 18,
        capslock: 20,
        numlock: 144
    })
    .directive('kmpKeyBind', ['keyCodes', function (keyCodes) {
        function map(obj) {
            var mapped = {};
            for (var key in obj) {
                var action = obj[key];
                if (keyCodes.hasOwnProperty(key)) {
                    mapped[keyCodes[key]] = action;
                }
            }
            return mapped;
        }

        return function (scope, element, attrs) {
            var bindings = map(scope.$eval(attrs.keyBind));
            element.bind("keydown", function (event) {
                if (bindings.hasOwnProperty(event.which)) {
                    scope.$apply(function() {
                         scope.$eval(bindings[event.which]);
                    });
                }
            });
        };
    }])


    

},{"client-utils":16,"doc-cookies":17,"logger":19,"logger-ring-buffer":18}],13:[function(require,module,exports){
var Logger = require("logger");


kmptoolApp.controller('ProjectListCtrl'
    , [ "$scope", "kmpSvc", "$timeout"
    , function($scope, kmpSvc, $timeout) {
        
        $scope.projects = [
            {
                id: 1
                , name: "One"
            }
            , {
                id: 2
                , name: "Two"
            }
            , {
                id: 2
                , name: "Three"
            }
            , {
                id: 2
                , name: "Four"
            }
        ];
        
        $scope.deleteProject = function($event, project) {
            console.log($event);
            Logger.infoi("Delete ", project);
            
            $event.stopPropagation();
        }

        $scope.openProject = function($event, project) {
            console.log($event);
            Logger.infoi("Open ", project);

            $event.stopPropagation();
        }
    }])

},{"logger":19}],14:[function(require,module,exports){
var Logger = require("logger");


kmptoolApp.controller('StartCtrl'
    , [ "$scope", "kmpSvc", "$timeout"
    , function($scope, kmpSvc, $timeout) {
        
        Logger.info("StartCtrl factory");
        $scope.startMsg = "Hello from Angular";

        $timeout(function() {
            Logger.info("Launching timed message");
            kmpSvc.showMessage("This is a message");
        }, 2000);
    }])

},{"logger":19}],15:[function(require,module,exports){
var Logger = require("logger");


kmptoolApp.controller('TopBarCtrl'
    , [ "$scope", "kmpSvc", "$timeout"
    , function($scope, kmpSvc, $timeout) {
        
    }])

},{"logger":19}],16:[function(require,module,exports){
var Logger = require("logger");

/**
 * Does a deep inspection of the two objects and returns true
 * as soon as it finds a difference.
 */
exports.areObjectsDifferent = function(a,b, ignoreKey) {
    if (typeof a != typeof b) return true;

    if (typeof a != "object") {
        return a != b;
    }

    // It's an object, so recurse into all sub params;
    var checked = {};

    for(var ix in a) {
        if (ignoreKey && ix == ignoreKey) continue;
        if ( exports.areObjectsDifferent(a[ix], b[ix]) ) return true;
        checked[ix] = true;
    }

    // Now look for differences using keys from b, but don't waste energy on 
    // things we already checked
    for(var ix in b) {
        if (ignoreKey && ix == ignoreKey) continue;
        // If there is a key in b that wasn't in a, then they are different
        if (!checked[ix]) return true;
    }

    // Hmm, looks ok
    return false;
}


// Private array of chars to use for uuids
var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

/**
 * Generates a universally (more or less) uid by creating a random stream
 * of characters. Should be reasonably fine most of the time.
 */
exports.uuid = function(len, chars) {
    len = len || 20;
    chars = chars || CHARS;
    var uuid = [];
    var radix = chars.length;

    for (var i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
    return uuid.join('');
};

},{"logger":19}],17:[function(require,module,exports){
/*\
|*|
|*|  :: cookies.js ::
|*|
|*|  A complete cookies reader/writer framework with full unicode support.
|*|
|*|  https://developer.mozilla.org/en-US/docs/DOM/document.cookie
|*|
|*|  This framework is released under the GNU Public License, version 3 or later.
|*|  http://www.gnu.org/licenses/gpl-3.0-standalone.html
|*|
|*|  Syntaxes:
|*|
|*|  * docCookies.setItem(name, value[, end[, path[, domain[, secure]]]])
|*|  * docCookies.getItem(name)
|*|  * docCookies.removeItem(name[, path], domain)
|*|  * docCookies.hasItem(name)
|*|  * docCookies.keys()
|*|
\*/

module.exports = {
  getItem: function (sKey) {
    return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
  },
  setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
    var sExpires = "";
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
          break;
        case String:
          sExpires = "; expires=" + vEnd;
          break;
        case Date:
          sExpires = "; expires=" + vEnd.toUTCString();
          break;
      }
    }
    document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
    return true;
  },
  removeItem: function (sKey, sPath, sDomain) {
    if (!sKey || !this.hasItem(sKey)) { return false; }
    document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + ( sDomain ? "; domain=" + sDomain : "") + ( sPath ? "; path=" + sPath : "");
    return true;
  },
  hasItem: function (sKey) {
    return (new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  },
  keys: /* optional method: you can safely remove it! */ function () {
    var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
    for (var nIdx = 0; nIdx < aKeys.length; nIdx++) { aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]); }
    return aKeys;
  }
};
},{}],18:[function(require,module,exports){
var Logger = require("logger")

function LoggerRingBuffer(options) {
    
    var self = this;

    self.options = {
        size: 50
        , logLevel: Logger.INFO
    }

    self.buffer = [];

    for(var ix in options) {
        self.options[ix] = options[ix];
    }

    Logger.addLogListener(self);
}
module.exports = LoggerRingBuffer;

var LRB = LoggerRingBuffer.prototype;



LRB.logMessage = function(opts, message) {
    var self = this;

    if (typeof opts.level == "undefined") {
        opts.level = Logger.INFO;
    }
    if(self.options.logLevel < opts.level)
        return;

    var entry = {
        level: opts.level
        , message: message
        , date: opts.date.valueOf()
    }
    if (opts.continuation) entry.continuation = true;

    self.buffer.push(entry);

    if (self.buffer.length > self.options.size) {
        self.buffer.shift();
    }
}

LRB.copyContent = function() {
    var self = this;

    var out = self.buffer.slice(0);

    return out;
}
},{"logger":19}],19:[function(require,module,exports){
(function (process,Buffer){
/*****
 * Copyright (c) 2011 Tom Seago
 * 
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation 
 * files (the "Software"), to deal in the Software without 
 * restriction, including without limitation the rights to use, 
 * copy, modify, merge, publish, distribute, sublicense, and/or 
 * sell copies of the Software, and to permit persons to whom 
 * the Software is furnished to do so, subject to the 
 * following conditions:
 * 
 * The above copyright notice and this permission notice shall be 
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, 
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES 
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, 
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, 
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR 
 * THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


/**
 * Module Dependencies
 */
var Util = require('util');

/**
 * Constants
 */
var LEVEL_SPACE = "     ";
var MAX_LEVEL_LENGTH = LEVEL_SPACE.length;
var CONTINUATION_SPACE = "             ";
var DAY_SPACE = "       ";
var NEWLINE_HEADER = "\n" + CONTINUATION_SPACE + LEVEL_SPACE + " | ";
var HR = "-----------------------------------------------------------------------";

var CSI = '\x1B[';

var COLOR_REST = CSI + "m";

exports.SEPARATOR_CHAR = false;

exports.DEBUG = 3;
exports.INFO =  2;
exports.WARN =  1;
exports.ERROR = 0;

var logLevelNames = [
    "ERROR",
    "WARNING",
    "INFO",
    "DEBUG",
]

exports.logLevel = exports.DEBUG;

exports.consoleFunctions = {};

if (console.log) {
    exports.consoleLog = console.log.bind(console);

    exports.consoleFunctions[exports.DEBUG] = console.log.bind(console);

    if (console.info) {
        exports.consoleFunctions[exports.INFO] = console.info.bind(console);
    }
    if (console.warn) {
        exports.consoleFunctions[exports.WARN] = console.warn.bind(console);
    }
    if (console.error) {
        exports.consoleFunctions[exports.ERROR] = console.error.bind(console);
    }
}

exports.pid = null;

// Refer to http://en.wikipedia.org/wiki/ANSI_escape_code
// 30-37 for foreground color, 39 = default
// 40-47 for background color, 49 = default
// 0:Black 1:Red 2:Green 3:Yellow 4:Blue 5:Magenta 6:Cyan 7:White
//
// 1 for bright (as opposed to dull)
// 22 for normal intensity
// 3 italic (23 off) = no work
// 4 underline (24 off) = Mac OK
// 5 blink (25 off) = no work
//
// The following don't work in Mac Terminal
// 51	Framed	
// 52	Encircled	
// 54 Not framed or encircled 
// 53 Overlined 
// 55	Not overlined

var COLORS = {};
COLORS[exports.DEBUG] = "32;22";
COLORS[exports.INFO] = "39;22";
COLORS[exports.WARN] = "34;1";
COLORS[exports.ERROR] = "31;1";

exports.DO_COLOR = true;

function d2(num) {
    return (num < 10 ? "0" : "") + num;
}

function d3(num) {
    return (num < 100 ? "0" : "") + (num < 10 ? "0" : "") + num;
}

// Listeners which will also receive the log messages
var logListeners = [];

///////////////////////////////////////////////////////////////////////////////
/**
 * The main logging function. All the other stuff really just sets values that
 * get passed into this funciton if possible.
 *
 * @param {Object} options - set of key value options
 *                  options.level - the level of the message, exports.DEBUG, exports.INFO, exports.WARN, or exports.ERROR
 *                  options.continuation - if set to true, this line is considered a continuation
 *                                         of the previous log message. In general this means it won't get it's
 *                                         own unique timestamp.
 *                  options.inspect - if true the Util.inpect method will be used instead of the to_string method for each argument
 * @param {Object} other arguments - All other arguments are output to the log stream either 
 *                                   using their to_string method or by calling Util.inspect on them
 * @type void
 */
function logLine(options) {
    var level = exports.INFO;
    if (typeof options.level !== "undefined") level = options.level;
    if(exports.logLevel < level)
        return;
    
    var line = [];
    if (options.continuation) {
        line.push(CONTINUATION_SPACE);
        if (exports.addDay) {
            line.push(DAY_SPACE);
        }
    } else {
        var d = new Date();
        options.date = d;

        if (exports.addDay) {
            line.push( d.getFullYear() );
            line.push( d2(d.getMonth()+1) );
            line.push( d2(d.getDate()) );
            line.push(" ");
        }

        line.push( d2(d.getHours()) )
        line.push(":")
        line.push( d2(d.getMinutes()) )
        line.push(":")
        line.push( d2(d.getSeconds()) )
        line.push(".")
        line.push(d3(d.getMilliseconds()))
        line.push(" ")
        while(line.join("") < CONTINUATION_SPACE.length) line.push(" ");

        if (exports.addDay) {
            while(line.join("") < (CONTINUATION_SPACE.length + DAY_SPACE.length)) line.push(" ");
        }
    }
  
    if (exports.DO_COLOR) {
        line.push(CSI); 
        line.push(COLORS[level]); 
        line.push('m');
    }
    line.push(logLevelNames[level].slice(0,MAX_LEVEL_LENGTH));
    //if (exports.DO_COLOR) line += COLOR_REST;
  
    for(var ix=logLevelNames[level].length; ix<MAX_LEVEL_LENGTH; ix++) line.push(" ");
    
    if (exports.pid) {
        line.push(" ");
        line.push(exports.pid);
    }
    line.push(" | ");
  
    //if (exports.DO_COLOR) line += CSI + COLORS[level] + 'm';
    var message = [];
    for(var ix=1; ix<arguments.length; ix++) {
        var val = arguments[ix];
        if (typeof val === 'undefined') val = 'undefined';
    
        if (options.inspect) {
            if (typeof val === 'string') {
                message.push(val);
            } else {
                message.push(Util.inspect(val));
            }
        } else {
            if (val!=null) {
                message.push(val.toString());
            } else {
                message.push("null");
            }
        }
        
        if (exports.SEPARATOR_CHAR)  message.push(exports.SEPARATOR_CHAR);
    }
    var msg = message.join("");
    line.push(msg);
    if (exports.DO_COLOR) line.push(COLOR_REST);

    // Now make sure newlines are properly replaced
    line = line.join("");
    line = line.replace(/\n/gm, NEWLINE_HEADER);

    // And output it ...
    if (exports.consoleFunctions) {
        var fn = exports.consoleFunctions[level] || exports.consoleLog;
        if (fn) {
            fn(line);
        } 
    } else {
        if (exports.consoleLog) {
            exports.consoleLog(line);
        }
    }
    
    
    // Now send it to any listeners that might be out there
    logListeners.forEach(function(listener) {
        try {
            listener.logMessage(options, msg);
        } catch (e) {
            console.log(e);
        }
    });
}
exports.logLine = logLine;

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
// Normal versions

///////////////////////////////////////////////////////////////////////////////
/**
 * Log all arguments as strings at the DEBUG level
 *
 * @param {Object} arguments* - All arguments are logged
 * @type void
 */
exports.debug = function() {
    var args = Array.prototype.slice.apply(arguments);
    args.unshift({level:exports.DEBUG});
    logLine.apply(null, args);  
}

///////////////////////////////////////////////////////////////////////////////
/**
 * Log all arguments as strings at the INFO level. Also aliased as 'log'.
 *
 * @param {Object} arguments* - All arguments are logged
 * @type void
 */
exports.info = function() {
    var args = Array.prototype.slice.apply(arguments);
    args.unshift({level:exports.INFO});
    logLine.apply(null, args);  
}
exports.log = exports.info;

///////////////////////////////////////////////////////////////////////////////
/**
 * Log all arguments as strings at the WARN level. Also aliased as 'warning'.
 *
 * @param {Object} arguments* - All arguments are logged
 * @type void
 */
exports.warn = function() {
    var args = Array.prototype.slice.apply(arguments);
    args.unshift({level:exports.WARN});
    logLine.apply(null, args);  
}
exports.warning = exports.warn;

///////////////////////////////////////////////////////////////////////////////
/**
 * Log all arguments as strings at the ERROR level. Also aliased as 'error'.
 *
 * @param {Object} arguments* - All arguments are logged
 * @type void
 */
exports.err = function() {
    var args = Array.prototype.slice.apply(arguments);
    args.unshift({level:exports.ERROR});
    logLine.apply(null, args);  
}
exports.error = exports.err;

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
// Inspect versions

///////////////////////////////////////////////////////////////////////////////
/**
 * Log all arguments using Util.inspect at the DEBUG level
 *
 * @param {Object} arguments* - All arguments are logged
 * @type void
 */
exports.debugi = function() {
      var args = Array.prototype.slice.apply(arguments);
      args.unshift({level:exports.DEBUG, inspect:true});
      logLine.apply(null, args);  
}

///////////////////////////////////////////////////////////////////////////////
/**
 * Log all arguments using Util.inspect at the INFO level. Also aliased as 'logi'.
 *
 * @param {Object} arguments* - All arguments are logged
 * @type void
 */
exports.infoi = function() {
    var args = Array.prototype.slice.apply(arguments);
    args.unshift({level:exports.INFO, inspect:true});
    logLine.apply(null, args);  
}
exports.logi = exports.infoi;

///////////////////////////////////////////////////////////////////////////////
/**
 * Log all arguments using Util.inspect at the WARN level. Also aliased as 'warningi'.
 *
 * @param {Object} arguments* - All arguments are logged
 * @type void
 */
exports.warni = function() {
    var args = Array.prototype.slice.apply(arguments);
    args.unshift({level:exports.WARN, inspect:true});
    logLine.apply(null, args);  
}
exports.warningi = exports.warni;

///////////////////////////////////////////////////////////////////////////////
/**
 * Log all arguments using Util.inspect at the ERROR level. Also aliased as 'erri'.
 *
 * @param {Object} arguments* - All arguments are logged
 * @type void
 */
exports.erri = function() {
    var args = Array.prototype.slice.apply(arguments);
    args.unshift({level:exports.ERROR, inspect:true});
    logLine.apply(null, args);  
}
exports.errori = exports.erri;

//----------------------------------------------------

///////////////////////////////////////////////////////////////////////////////
/**
 * Insert a horizontal rule in the logging output. Useful for visually separating
 * a particular group of log output.
 *
 * @param {String} ch - character to use for the line. Defaults to -
 * @type void
 */
exports.hr = function(ch) {
    line = "";

    if (ch) {
        for(var ix=0; ix<HR.length; ix++) {
            line += ch;
        }
    } else {
        line = HR;
    }

    console.log(line);
}

///////////////////////////////////////////////////////////////////////////////
/**
 * Logs the stack trace either from the based in exception or will generate a
 * new exception internally in order to have a stack trace. Obviously doing
 * that will have some crufty stuff in it, but it will also have none crufty
 * things.
 *
 * @param {Exception} ex - exception object to log. May be null. 
 * @type void
 */
exports.logStack = function(ex) {
    // Get an exception object
    var createdEx = false;
    
    var msg = null;
    if ((typeof ex) === "string") {
        msg = ex;
        ex = null;
    }
    ex = ex || (function() {
        createdEx = true;
        try {
            var _err = __undef__ << 1;
        } catch (e) {
            return e;
        }
    })();

    var stack = ex.stack;
    if (createdEx && stack) {
        // Take the string apart and rip of the top 3 lines
        var lines = stack.split("\n");
        
        if (lines.length > 3) {
            stack = lines.slice(3,lines.length).join("\n");
        }
    }

    if (msg) {
        stack = msg + "\n" + stack;
    }
    
    // Output the stacktrace
    logLine({level:exports.ERROR}, stack);
};

exports.logStackTrace = exports.logStack;

///////////////////////////////////////////////////////////////////////////////
/**
 * Similar to logStack but allows a function to be passed in that will stop
 * the stack trace. Useful if your code all sits behind a large framework
 * stack and you want to stop at the boundary of your code without caring about
 * the framework.
 *
 * @param {Exception} ex - exception object to log. May be null. 
 * @param {Object} opts - options for the log function. Entirely optional, but necessary
 *                          if you want to change the log level for example.
 * @type void
 */
exports.logStackUntil = function(lastFunc, opts) {
    // Get an exception object
    var ex = (function() {
        try {
            var _err = __undef__ << 1;
        } catch(e) {
            return e;
        }
    })();

    // Turn this into a usable array of things
    var stack = [];
    var lines = ex.stack.split('\n');

    // First 3 lines are BS from the generation of the error above
    lines.shift();
    lines.shift();
    // lines.shift();
    var opts = opts || {
        level: exports.INFO
    };
    var line;
    while (line = lines.shift()) {
        line = line.slice(7);

        var parts;
        if (line[0] === "[") {
            parts = [line, ""];
        } else {
            parts = line.split(" ");
        }

        if (lastFunc) {
            if ((parts[0] === lastFunc) || (parts[1] === lastFunc)) return;
        }

        line = parts[0];
        while (line.length < 30) line += " ";
        line += parts[1];

        logLine(opts, line);
        opts.continuation = true;
    }
}


///////////////////////////////////////////////////////////////////////////////
/**
 * Convenience method for logging errors returned to callbacks. If the error 
 * parameter is null nothing will be output so it's save to always call this
 * function in the async callback and things will only be output if an error
 * has actually occurred.
 * 
 * If the error parameter is a real Error object with a stack associated with
 * it then the stack is also logged as a continuation in a nice format.
 *
 * @param {String} msg - App specific message to prefix the returned error message with.
 * @param {Error} error - An object representing the error that occurred. This object
 *                  is also used as the return value of the function to allow using
 *                  the function in an if statement.
 * @returns The error object that was passed in to it
 * @type Error
 */
exports.logErrorObj = function(msg, error) {
    if (!error) return null;

    if (error.stack) {
        this.error(msg," ",error);
        logLine({level:exports.ERROR, continuation:true}, error.stack);
    } else {
        this.errori(msg," ",error);
    }
    
    return error;
}

///////////////////////////////////////////////////////////////////////////////
/**
 * Retrieves a stream-like object with a write method that will write data
 * at the requested log level. The write function on the returned object
 * accepts a text parameter and an encoding parameter. This is useful for
 * pushing into the default connect logging middleware
 *
 * @param {log level constant} level - The level at which the string will write.
 * @returns A stream-like object with a write(text,encoding) function that
 *          will output data at the level the object was constructed with.
 * @type Something that looks like a stream
 */
exports.logStream = function(level) {
    
    level = level || exports.INFO;
    
    return {
        write: function(text, encoding) {
        
            if (encoding != "ascii" && encoding != "utf8") {
                var b = new Buffer(text, encoding)
                text = b.toString("utf8");
            }

            text = text.trimRight();
            logLine({level:level, inspect:false}, text);
        }
    };
}


///////////////////////////////////////////////////////////////////////////////
/**
 * Adds a listener which will receive all log messages. The listener is expected
 * to implement a function of the form
 *
 *    logMessage(options, message)
 *
 * which is a signature similar to the standard logLine method and which will
 * receive the same options sent to logLine. The key difference is that the 
 * message parameter has already collected all of the arguments send to logLine
 * so the listener only needs to process a single string. This string may contain
 * newline characters.
 *
 * This allows external plugins to get all the data that flows through the logging
 * system. They need to filter things appropriately on their own.
 *
 * @param {Object} logListener - the listener to add
 * @type void
 */
exports.addLogListener = function(logListener) {
    
    logListeners.push(logListener);
}



///////////////////////////////////////////////////////////////////////////////
/**
 * Add a listener which will transmit log messages to loggly either as plain text
 * or as json messages if the json option is set for the loggly config.
 */
// exports.addLoggly = function(token, configOpts) {

//     var loggly = require('loggly');
//     var client = loggly.createClient(configOpts);

//     if (typeof configOpts.localLevel == "undefined") {
//         var logLevel = exports.WARN;
//     } else {
//         var logLevel = configOpts.localLevel;
//     }

//     this.addLogListener({
//         logMessage: function(opts, msg) {

//             if (opts.level > logLevel) return;

//             var timestamp = opts.date.valueOf() || Date.now();

//             if (!configOpts.json) {
//                 // Text
//                 var out = ["", timestamp, " "];
//                 out.push("LOG"+logLevelNames[opts.level]);
//                 out.push(" ");
//                 out.push(msg);
//                 out = out.join("");
//             } else {
//                 // JSON for the win
//                 var out = {
//                     timestamp: timestamp
//                     , message: msg
//                     , level: logLevelNames[opts.level]
//                 }
//                 if (opts.type) {
//                     out.type = opts.type;
//                 }
//             }

//             client.log(token, out)
//         }
//     });
// }


///////////////////////////////////////////////////////////////////////////////
/**
 * Writes the pid of the current process to a named file in a particular
 * directory. This is useful in a number of unixy situations.
 */
exports.writePid = function(dir, name) {
    if (dir && name) {
        // Write this process pid to a file
        var out = ""+process.pid;

        var name = require("path").join(dir, name);
        exports.info("Writing pid ",out," to ",name);
        require("fs").writeFile(name, out, null, function(err) {
            exports.logErrorObj("Writing pid file to "+name, err);
        });
    } else {
        exports.debug("Not writing pid file");
    }
}


}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":9,"buffer":3,"fs":2,"path":8,"util":11}]},{},[1]);
