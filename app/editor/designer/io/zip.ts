/**
 * Minimal ZIP writer (stored, no compression).
 *
 * A real export should hand back a single downloadable archive, and pulling
 * in a compression library for a handful of text files isn't worth it.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

interface Entry {
  nameBytes: Uint8Array;
  data: Uint8Array;
  crc: number;
  offset: number;
}

function dosTime(d: Date): { time: number; date: number } {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2) & 0x1f),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

export function createZip(files: { path: string; contents: string }[], stamp: Date): Blob {
  const encoder = new TextEncoder();
  const { time, date } = dosTime(stamp);
  const chunks: Uint8Array[] = [];
  const entries: Entry[] = [];
  let offset = 0;

  const push = (bytes: Uint8Array) => {
    chunks.push(bytes);
    offset += bytes.length;
  };

  const header = (size: number) => {
    const buf = new ArrayBuffer(size);
    return { buf, view: new DataView(buf), bytes: new Uint8Array(buf) };
  };

  for (const file of files) {
    const nameBytes = encoder.encode(file.path);
    const data = encoder.encode(file.contents);
    const crc = crc32(data);
    const entryOffset = offset;

    const { view, bytes } = header(30);
    view.setUint32(0, 0x04034b50, true); // local file header
    view.setUint16(4, 20, true); // version needed
    view.setUint16(6, 0x0800, true); // UTF-8 names
    view.setUint16(8, 0, true); // stored
    view.setUint16(10, time, true);
    view.setUint16(12, date, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);

    push(bytes);
    push(nameBytes);
    push(data);

    entries.push({ nameBytes, data, crc, offset: entryOffset });
  }

  const centralStart = offset;
  for (const e of entries) {
    const { view, bytes } = header(46);
    view.setUint32(0, 0x02014b50, true); // central directory header
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0x0800, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, time, true);
    view.setUint16(14, date, true);
    view.setUint32(16, e.crc, true);
    view.setUint32(20, e.data.length, true);
    view.setUint32(24, e.data.length, true);
    view.setUint16(28, e.nameBytes.length, true);
    view.setUint32(42, e.offset, true);

    push(bytes);
    push(e.nameBytes);
  }
  const centralSize = offset - centralStart;

  const { view, bytes } = header(22);
  view.setUint32(0, 0x06054b50, true); // end of central directory
  view.setUint16(8, entries.length, true);
  view.setUint16(10, entries.length, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralStart, true);
  push(bytes);

  return new Blob(chunks as BlobPart[], { type: 'application/zip' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
