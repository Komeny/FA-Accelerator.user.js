// ==UserScript==
// @name        FA KA Developer
// @namespace   example.com
// @include     https://www.furaffinity.net/*
// @include     https://furaffinity.net/*
// @include     http://www.furaffinity.net/*
// @include     http://furaffinity.net/*
// @version     1
// @connect     localhost
// @downloadURL https://raw.githubusercontent.com/Komeny/FA-Accelerator.user.js/master/dev/Developer.user.js
// @grant       GM_xmlhttpRequest
// @grant       GM.openInTab
// @require     http://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js
// ==/UserScript==

const uri = 'http://localhost:3003/FA_Keyboard_Accelerators.user.js?ts='+(+new Date());
GM_xmlhttpRequest({
	method: 'GET',
	url: uri,
	onload: function(d){
		eval(d.responseText);
	}
})
