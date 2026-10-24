// Compatibility entry point; npm run dev starts the standalone local server.
process.argv.push('--local');
await import('./server.mjs');
