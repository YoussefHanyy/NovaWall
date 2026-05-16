/**
 * Creates icon.ico wrapping the existing icon.png (256x256 PNG-in-ICO format).
 * Windows accepts PNG-in-ICO for 256x256. Smaller sizes use the same PNG scaled by Windows.
 */
const path = require('path');
const fs = require('fs');

const pngPath = path.join(__dirname, '..', 'assets', 'icons', 'icon.png');
const icoPath = path.join(__dirname, '..', 'assets', 'icons', 'icon.ico');

const png = fs.readFileSync(pngPath);

// ICO header: reserved(2) + type(2) + count(2) = 6 bytes
// Dir entry: width(1)+height(1)+colorCount(1)+reserved(1)+planes(2)+bitCount(2)+size(4)+offset(4) = 16 bytes
// One image: header=6, dir=16, data starts at offset 22
const buf = Buffer.alloc(6 + 16 + png.length);
let pos = 0;

buf.writeUInt16LE(0, pos); pos += 2;   // reserved
buf.writeUInt16LE(1, pos); pos += 2;   // type: ICO
buf.writeUInt16LE(1, pos); pos += 2;   // 1 image

// Directory entry for 256x256 (use 0 to indicate 256)
buf.writeUInt8(0, pos++);              // width  (0 = 256)
buf.writeUInt8(0, pos++);              // height (0 = 256)
buf.writeUInt8(0, pos++);              // color count
buf.writeUInt8(0, pos++);              // reserved
buf.writeUInt16LE(1, pos); pos += 2;   // planes
buf.writeUInt16LE(32, pos); pos += 2;  // bit count
buf.writeUInt32LE(png.length, pos); pos += 4;
buf.writeUInt32LE(22, pos); pos += 4;  // data starts right after header+dir

png.copy(buf, pos);

fs.writeFileSync(icoPath, buf);
console.log('icon.ico saved:', icoPath);
