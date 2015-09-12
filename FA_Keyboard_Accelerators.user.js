// ==UserScript==
// @name        FA Keyboard Accelerators
// @namespace   example.com
// @include     https://www.furaffinity.net/*
// @include     https://furaffinity.net/*
// @include     http://www.furaffinity.net/*
// @include     http://furaffinity.net/*
// @version     4
// @grant       GM_xmlhttpRequest
// @require     http://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js
// ==/UserScript==

Cache = (function() {
	var instance;
	// define private "members" here
	// define them as simple closure variables
	// use "instance" instead of "this"
	var imglinkcache = {};

	return function() {
		if (instance) { return instance; }
		instance = this;

		// public members
		instance.requestImage = function(id, callback) {
			if(imglinkcache[id]) {
				console.log("Serving "+id+" from cache")
				return callback(imglinkcache[id]);
			}
			// Get submission page
			var dom = $("<f></f>").load("/view/"+id+"/"+" #submissionImg", function() {
				instance.save(id, dom)
				return callback(imglinkcache[id]);
			});
		}
		instance.save = function(id, dom) {
			console.log("adding to cache: "+id+" : ")
			imglinkcache[id] = dom.children().attr("src");
		}

		// do not remove this:
		return instance;
	};
})();

Prefetcher = (function() {
	var instance;
	// define private "members" here
	// define them as simple closure variables
	// use "instance" instead of "this"
	var handle = false;
	var interval = 500;
	var prefetchlist = new Array();

	var prefetch = function() {
		if(prefetchlist.length > 0) {
			var e = prefetchlist.shift();
			var dom = $("<f></f>").load(e.path, function() {
				handle = window.setTimeout(prefetch, interval);
				e.callback(dom);
			});
		}
	}

	return function() {
		if (instance) { return instance; }
		instance = this;

		// public members
		instance.request = function(path, callback) {
			prefetchlist.push({"path": path, "callback": callback})

			if(!handle){
				console.log("Starting prefetcher")
				handle = window.setTimeout(prefetch, interval)
			}
		}
		// do not remove this:
		return instance;
	};
})();

var Slideshow = (function() {
	var instance;
	// define private "members" here
	// define them as simple closure variables
	// use "instance" instead of "this"
	var slideshow_data = {};
	var lightbox;

	return function() {
		if (instance) { return instance; }
		instance = this;

		// private members
		var pos = 0;

		// initialisations
		lightboximg = $("<img></img>")
		lightbox = $("<lightbox id='fa_accelerate_lightbox'></lightbox>")
		lightbox.appendTo($("body"))
		lightboximg.appendTo(lightbox)
		$("body").append("<style>\
			#fa_accelerate_lightbox {\
				display: block; position:fixed; top:0; left:0; width:100%; height:100%;\
				z-index:1000; overflow:hidden;\
				box-sizing: border-box;\
				background-color: rgba(0,0,0,.8);\
				padding: 4em 1em 1em;\
				\
			}\
			#fa_accelerate_lightbox img {\
				display:block; margin:0 auto; min-width:2em; min-height:2em;\
				max-width:100%; max-height:100%; height:auto; width:auto;\
				\
			}\
		</style>")

		var images = {}
		var pages = $(".browse,.gallery,.messagecenter").find("b.t-image")
			.map(function(i,e) {
				var id = e.id.replace(/sid_(.*)/, "$1");
				Prefetcher().request("/view/"+id+"/ #submissionImg",
					function(dom){Cache().save(id, dom) });
				return id;
			});

		// // load & preload images
		// var preload = function(pos) {
		// 	if(pos < pages.length) {
		// 		window.settimeout(100, function() {
		// 			$.get(pages[pos], function() {
		// 				preload(pos+1)
		// 			})
		// 		})
		// 	}
		// }

		// public members
		instance.go = function(pos) {
			if (pages.length > pos && pos >= 0) {
				Cache().requestImage(pages[pos], function(path) {
					lightboximg.attr("src", path);
				})
			}
			else {
				return false;
			}
		}
		instance.show = function() {
			lightbox.show(1);
			return instance.go(pos);
		}
		instance.hide = function() {
			return lightbox.hide(.5);
		}
		instance.open = function() {
			return window.location.href = "/view/"+pages[pos]+"/";
		}
		instance.show_next = function() {
			if(pages.length > pos) {
				return instance.go(++pos);
			}
			else {
				return false;
			}
		}
		instance.show_previous = function() {
			if(pos > 0){
				return instance.go(--pos);
			}
			else {
				return false;
			}
		}

		// do not remove this:
		return instance;
	};
})();

var keymap = "basic"
var keymappings = {
	"basic" : {
		37: function() { // [<-]
			var e = $("button[value=Back], a.button.prev")
			if(e.length > 0) { e[0].click(); return false }
		},
		39: function() { // [->]
			var e = $("button[value=Next], a.button.next")
			if(e.length > 0) { e[0].click(); return false }
		},
		70: function() { // F
			var foundsomething = false;
			$("html a").each(function(i, self){
				if(self.text == "+Add to Favorites") {
					self.click()
					foundsomething = true
				}
			})
			return !foundsomething
		},
		71: function() { // G
			var foundsomething = false;
			$("html a").each(function(i, self){
				if(self.text == "Go to Gallery" || self.text == "Gallery") {
					self.click()
					foundsomething = true
				}
			})
			return !foundsomething
		},
		27: function() { // [ESC]
			console.log("basic ESC");
			Slideshow().hide();
			keymap = "basic";
			return false;
		},
		83: function() { // S
			keymap = "lightbox";
			window.setTimeout(function() {Slideshow().show()}, 0);
			return false;
		},
		87: function() { // W
			var e = $("a:contains('+Watch')")
			if(e.length > 0) {
				e[0].click()
				return false
			}
		}
	},
	"lightbox": {
		27: function() { // [ESC]
			console.log("lightbox ESC");
			Slideshow().hide();
			keymap = "basic";
			return false;
		},
		37: function() { // [<-]
			console.log("lightbox prev");
			Slideshow().show_previous(); return false;
		},
		39: function() { // [->]
			console.log("lightbox next");
			if(Slideshow().show_next() == false) {
				Slideshow().hide();
				keymap = "basic";
			}
			return false;
		},
		// 70: function() { // F
		// 	var foundsomething = false;
		// 	$("html a").each(function(i, self){
		// 		if(self.text == "+Add to Favorites") {
		// 			self.click()
		// 			foundsomething = true
		// 		}
		// 	})
		// 	return !foundsomething
		// },
		79: function() { // O
			Slideshow().open(); return false;
		},
		0: function() {} // dummy
	}
}

$('html').on("keydown", function(event) {
	if (keymappings[keymap][event.which]) {
		return keymappings[keymap][event.which](event, event.which, event)
	}
});

