const express = require('express');
const app = express();
const port = 3003;
const fs = require('fs');
const fln = 'FA_Keyboard_Accelerators.user.js';
const flpath = `../${fln}`

var script = "";

function loadscript() {
	fs.readFile(flpath, 'utf8', function(err, data) {
		script = data + "";
	})
}

// Watch for file changes
fs.watchFile(flpath, (curr, prev) => {
	console.log(`${fln} changed, reloading`);
	loadscript();
});

// Initial load file
loadscript();

app.get(`/${fln}`, function(req, res) {
	res.set('Content-Type', 'application/javascript');
	res.send(script);
});
app.listen(port, () => console.log(`Listening on port ${port}!`))
