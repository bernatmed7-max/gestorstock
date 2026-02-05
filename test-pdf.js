const fs = require('fs');
try {
    const pdf = require('pdf-parse');
    console.log('PDF-parse loaded successfully');
    console.log('Default export type:', typeof pdf);
} catch (e) {
    console.error('Failed to load pdf-parse:', e);
}
