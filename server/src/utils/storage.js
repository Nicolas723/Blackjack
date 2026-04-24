const fs = require('fs');
const path = require('path');

const STORAGE_PATH = path.join(__dirname, '../../data/players.json');

function load() {
  try {
    const dir = path.dirname(STORAGE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(STORAGE_PATH)) return {};
    const content = fs.readFileSync(STORAGE_PATH, 'utf-8');
    return JSON.parse(content || '{}');
  } catch (e) {
    console.error('Storage load error', e);
    return {};
  }
}

function save(data) {
  try {
    const dir = path.dirname(STORAGE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Storage save error', e);
  }
}

module.exports = { load, save };
