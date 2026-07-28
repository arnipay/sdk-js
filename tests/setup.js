const path = require('path');
const dotenv = require('dotenv');

// Prefer tests/.env (integration credentials), fall back to project root .env
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
