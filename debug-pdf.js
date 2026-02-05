try {
    const pdf = require('pdf-parse');
    console.log('require("pdf-parse"):', typeof pdf);
    console.log('Keys:', Object.keys(pdf));
} catch (e) {
    console.log('require("pdf-parse") failed:', e.message);
}

try {
    const pdfNode = require('pdf-parse/node');
    console.log('require("pdf-parse/node"):', typeof pdfNode);
    console.log('Keys:', Object.keys(pdfNode));
    if (typeof pdfNode.default === 'function') {
        console.log('Found default export in pdf-parse/node');
    }
} catch (e) {
    console.log('require("pdf-parse/node") failed:', e.message);
}
