const fs = require('fs');
console.log("ENV KEYS:", Object.keys(process.env).filter(k => k.toLowerCase().includes('supabase') || k.toLowerCase().includes('service') || k.toLowerCase().includes('key') || k.toLowerCase().includes('url')));
