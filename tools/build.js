/* Copies only what the site needs into dist/ for hosting: the page, the offline worker, the install manifest and the art. */
var fs = require('fs'), path = require('path');
var root = path.join(__dirname, '..'), out = path.join(root, 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'img'), { recursive: true });
['index.html', 'sw.js', 'manifest.webmanifest', 'sigils.js'].forEach(function (f) { fs.copyFileSync(path.join(root, f), path.join(out, f)); });
fs.readdirSync(path.join(root, 'img')).forEach(function (f) { fs.copyFileSync(path.join(root, 'img', f), path.join(out, 'img', f)); });
fs.mkdirSync(path.join(out, 'snd'), { recursive: true });
fs.readdirSync(path.join(root, 'snd')).forEach(function (v) { fs.copyFileSync(path.join(root, 'snd', v), path.join(out, 'snd', v)); });
fs.mkdirSync(path.join(out, 'vendor'), { recursive: true });
fs.readdirSync(path.join(root, 'vendor')).forEach(function (v) { fs.copyFileSync(path.join(root, 'vendor', v), path.join(out, 'vendor', v)); });
console.log('built dist/ with', fs.readdirSync(path.join(out, 'img')).length, 'images');
