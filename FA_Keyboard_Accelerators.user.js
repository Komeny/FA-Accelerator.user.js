// ==UserScript==
// @name        FA Keyboard Accelerators
// @namespace   example.com
// @include     https://www.furaffinity.net/*
// @include     https://furaffinity.net/*
// @include     http://www.furaffinity.net/*
// @include     http://furaffinity.net/*
// @version     15
// @downloadURL https://raw.githubusercontent.com/Komeny/FA-Accelerator.user.js/master/FA_Keyboard_Accelerators.user.js
// @grant       GM_xmlhttpRequest
// @grant       GM_openInTab
// @require     http://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js
// ==/UserScript==

var keymap = "basic"

var css_body = `
`

var css_lightbox = `
#fa_accelerate_lightbox {
    display: flex;
    align-items: center;
    position:fixed;
    top:0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 999999991;
    overflow: hidden;
    box-sizing: border-box;
    background-color: rgba(0,0,0,.8);
    padding: 1em;
}
#fa_accelerate_lightbox .lightbox_close {
    position: absolute;
    right: 0;
    top: 0;
    font-size: 40px;
    padding: 50px;
    line-height: 1;
    z-index: 1;
    outline: 0;
}
#fa_accelerate_lightbox .lightbox_close::before {
    content: "✖";
}
#fa_accelerate_lightbox .lightbox_btn {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 30%;
    outline: 0;
}
#fa_accelerate_lightbox .lightbox_close::before,
#fa_accelerate_lightbox .lightbox_btn::before {
    display: block;
    opacity: 0.5;
    color: #fff;
    text-shadow: 0 0 8px rgba(0,0,0,0.3);
    transition: opacity 0.15s ease-in-out;
}
#fa_accelerate_lightbox .lightbox_btn::before {
    position: absolute;
    top: 50%;
    font-size: 100px;
    transform: translateY(-50%);
}
#fa_accelerate_lightbox .lightbox_btn.disabled {
    cursor: default;
}
#fa_accelerate_lightbox .lightbox_btn.disabled::before,
#fa_accelerate_lightbox .lightbox_btn.disabled:hover::before,
#fa_accelerate_lightbox .lightbox_btn.disabled:focus::before {
    opacity: 0.2;
}
#fa_accelerate_lightbox .lightbox_close:hover::before,
#fa_accelerate_lightbox .lightbox_close:focus::before,
#fa_accelerate_lightbox .lightbox_btn:hover::before,
#fa_accelerate_lightbox .lightbox_btn:focus::before {
    opacity: 1;
}
#fa_accelerate_lightbox .lightbox_prev {
    left: 0;
}
#fa_accelerate_lightbox .lightbox_next {
    right: 0;
}
#fa_accelerate_lightbox .lightbox_prev::before {
    content:'‹';
    left: 50px;
}
#fa_accelerate_lightbox .lightbox_next::before {
    content:'›';
    right: 50px;
}
#fa_accelerate_lightbox img {
    margin:0 auto;
    max-width:100%;
    max-height:100%;
}
`

var Context = (function() {
	var instance;
	var context = false;
	var username = false;

	// Detect context
	// Types: user-profile, user-gallery, submission, browse, search
	var pathcrumb = window.location.pathname.match(/^\/([^\/]+)/)
	var crumbs = {
		search:	 "search",
		browse:	 "browse",
		view:	 "submission",
		gallery: "user-gallery",
		user:	 "user-profile",
	}
	console.log(pathcrumb)
	if (crumbs[pathcrumb]) {
		context = crumbs[pathcrumb];
	}

	// Detect user name
	if ($(".submission-title > span > a > strong").length > 0) {
		username = $(".submission-title > span > a > strong").text()
		console.log(username)
	};

	return function(argument) {
		if (instance) { return instance; }
		instance = this;
	}
})()

var Cache = (function() {
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
				//console.log("Serving "+id+" from cache")
				return callback(imglinkcache[id]);
			}
			// Get submission page
			var dom = $("<f></f>").load("/view/"+id+"/"+" #submissionImg", function() {
				instance.save(id, dom)
				return callback(imglinkcache[id]);
			});
		}
		instance.save = function(id, dom) {
			imglinkcache[id] = dom.children().attr("src");
		}

		// do not remove this:
		return instance;
	};
})();

var Prefetcher = (function() { // TODO: Rewrite this.
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
		var lightboximg = $("<img></img>")
		lightbox = $("<lightbox id='fa_accelerate_lightbox'>\
			<a href='#' class='lightbox_prev lightbox_btn'></a>\
			<a href='#' class='lightbox_next lightbox_btn'></a>\
			<a href='#' class='lightbox_close'></a>\
		</lightbox>")
		lightbox.appendTo($("body"))
		lightboximg.appendTo(lightbox)
		$("body").append("<style>" + css_lightbox + "</style>")

		var images = {}
		var pages = $(".browse,.gallery,.messagecenter").find("figure.t-image")
			.map(function(i,e) {
				var id = e.id.replace(/sid-(.*)/, "$1");
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
			lightbox.fadeIn(150);
			return instance.go(pos);
		}
		instance.hide = function() {
			lightbox.fadeOut(150);
			keymap = "basic";
			return false;
		}
		instance.open = function() {
			var l = window.location
			var url = l.protocol+"//"+l.hostname+"/view/"+pages[pos]+"/"
			return GM_openInTab(url, true);
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

		// click handlers
		$("#fa_accelerate_lightbox .lightbox_next").click(function() {
			if(instance.show_next() == false) {
				instance.hide();
			}
			return false;
		})
		$("#fa_accelerate_lightbox .lightbox_prev").click(instance.show_previous)
		$("#fa_accelerate_lightbox .lightbox_close").click(function() {
			instance.hide();
			return false;
		})

		lightbox.fadeOut(0);
		// do not remove this:
		return instance;
	};
})();

var keymappings = {
	"basic" : {
		37: function() { // [<-]
			//                                                                            detail view     gallery
			var e = $("button[value=Back], a.button-link:contains('Back'), a.button.prev, .button a.prev, button.button:contains('Prev')")
			if(e.length > 0) { e[0].click(); return false }
		},
		39: function() { // [->]
			//                                                                            detail view     gallery
			var e = $("button[value=Next], a.button-link:contains('Next'), a.button.next, .button a.next, button.button:contains('Next') ")
			if(e.length > 0) { e[0].click(); return false }
		},
		70: function() { // F
			var foundsomething = false;
			$(".button.fav").each(function(i, self){
				if(self.text == "+ Fav") {
					self.click()
					foundsomething = true
				}
			})
			return !foundsomething
		},
		71: function() { // G
			var foundsomething = false;
			$("html a").each(function(i, self){
				if(self.pathname.match("^/gallery")) {
					self.click()
					foundsomething = true
				}
			})
			return !foundsomething
		},
		27: function() { // [ESC]
			return Slideshow().hide();
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
			return Slideshow().hide();
		},
		83: function() { // S
			return Slideshow().hide();
		},
		37: function() { // [<-]
			Slideshow().show_previous(); return false;
		},
		39: function() { // [->]
			if(Slideshow().show_next() == false) {
				Slideshow().hide();
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

$('html').on("keydown", function(e) {
	if ($(e.target).is("input") || $(e.target).is("textarea"))
		return true

	if (keymappings[keymap][e.which] && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
		//console.log(e)
		return keymappings[keymap][e.which](e, e.which, e)
	}
});

$(function() {
	$("body").append("<style>" + css_body + "</style>");
})
