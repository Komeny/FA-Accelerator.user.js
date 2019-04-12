// ==UserScript==
// @name        FA Keyboard Accelerators
// @namespace   example.com
// @include     https://www.furaffinity.net/*
// @include     https://furaffinity.net/*
// @include     http://www.furaffinity.net/*
// @include     http://furaffinity.net/*
// @version     19
// @downloadURL https://raw.githubusercontent.com/Komeny/FA-Accelerator.user.js/master/FA_Keyboard_Accelerators.user.js
// @grant       GM.xmlhttpRequest
// @grant       GM.openInTab
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

	#fa_accelerate_lightbox img {
		box-shadow: 0 0 100px rgba(0,0,0,1);
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
	.progress-bar {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 5px;
		background-color: rgba(255, 255, 255, 0.2);
		z-index: -2;
	}
	.progress-bar .progress {
		background-color: rgba(255, 255, 255, 0.6);
		width: 0%;
		height: 100%;
		transition: width 0.3s ease-out;
	}
`

var Facts = (function() {
	var instance;
	var context = false;
	var username = false;

	// Detect context
	// Types: user-profile, user-gallery, submission, browse, search
	var pathcrumb = window.location.pathname.match(/^\/([^\/]+)/);
	var crumbs = {
		search:	 "search",
		browse:	 "browse",
		view:	 "submission",
		gallery: "user-gallery",
		user:	 "user-profile",
	};
	console.log(pathcrumb)
	if (crumbs[pathcrumb]) {
		context = crumbs[pathcrumb];
	}

	// Detect user name
	if ($(".submission-title > span > a > strong").length > 0) {
		username = $(".submission-title > span > a > strong").text();
		console.log(username);
	}

	return function(argument) {
		if (instance) { return instance }
		instance = this;
	}
})()

var Cache = (function() {
	var instance;
	var imglinkcache = {};

	return function() {
		if (instance) { return instance }
		instance = this;

		// public members
		instance.requestImage = function(id, callback) {
			if(imglinkcache[id]) {
				//console.log("Serving "+id+" from cache")
				return callback(imglinkcache[id]);
			}
			// Get submission page
			var dom = $("<img/>").attr('src', id, function() {
				instance.save(id, dom)
				return callback(imglinkcache[id]);
			});
		}
		instance.requestImage_bak = function(id, callback) {
			if(imglinkcache[id]) {
				//console.log("Serving "+id+" from cache")
				return callback(imglinkcache[id]);
			}
			// Get submission page
			var dom = $("<f></f>").load(`/view/${id}/ #submissionImg`, function() {
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
	var interval = 10;
	var prefetchlist = new Array();

	var prefetch = function() {
		if(prefetchlist.length > 0) {
			var e = prefetchlist.shift();
			var img = $('<img/>').on('load', function() {
				handle = window.setTimeout(prefetch, interval);
				e.callback(e.path);
			});
			img.attr('src', e.path);
		}
	}

	return function() {
		if (instance) { return instance; }
		instance = this;

		// public members
		instance.request = function(path, callback) {
			prefetchlist.push({"path": path, "callback": callback});

			if(!handle){
				handle = window.setTimeout(prefetch, interval);
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
		if (instance) { return instance }
		instance = this;

		// private members
		var pos = 0;

		// Prefetch images
		var pages = $(".browse,.gallery,.messagecenter").find("figure.t-image img")
			.map(function(i,e) {
				// src="//t.facdn.net/31164681@300-1555105530.jpg"
				var r = e.src.match(/^(https?):(\/\/t\.facdn\.net)\/(\d+)@\d+-(\d+.*)/);
				var id = `${r[1]}:${r[2]}/${r[3]}@1280-${r[4]}`
				
				Prefetcher().request(id, () => true );
				return {
					url: id,
					sub_id: r[3],
					sub_url: `${r[1]}://www.furaffinity.net/view/${r[3]}/`
				};
			});

		// initialisations
		var lightboximg = $("<img></img>")
		lightbox = $(`
			<lightbox id='fa_accelerate_lightbox'>
				<a href='#' class='lightbox_prev lightbox_btn'></a>
				<a href='#' class='lightbox_next lightbox_btn'></a>
				<a href='#' class='lightbox_close'></a>
				<div class="progress-bar"><div class="progress"></div></div>
			</lightbox>
		`);
		lightbox.appendTo($("body"))
		lightboximg.appendTo(lightbox)
		$("body").append("<style>" + css_lightbox + "</style>")

		var $lightbox_next  = $("#fa_accelerate_lightbox .lightbox_next");
		var $lightbox_prev  = $("#fa_accelerate_lightbox .lightbox_prev");
		var $lightbox_close = $("#fa_accelerate_lightbox .lightbox_close");
		var $progressbar = $("#fa_accelerate_lightbox .progress-bar .progress");

		var images = {}
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
		instance.go = function(pos1) {
			if (pages.length > pos1 && pos1 >= 0) {
				lightboximg.attr("src", pages[pos1].url);
				$progressbar.width(`${((pos1+1)/(pages.length))*100}%`)
			}
			else {
				return false;
			}
		}
		instance.show = function() {
			if (pages.length > 0) {
				lightbox.fadeIn(150);
				return instance.go(pos);
			}
		}
		instance.hide = function() {
			lightbox.fadeOut(150);
			keymap = "basic";
			return false;
		}
		instance.open = function() {
			GM.openInTab(pages[pos].sub_url, true);
			return false;
		}
		instance.show_next = function() {
			if(pages.length > pos+1) {
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
		instance.show_first = function() {
			instance.go(pos = 0);
			return false;
		}
		instance.show_last = function() {
			instance.go(pos = ((pages.length>0) ? pages.length-1 : 0));
			return false;
		}
		instance.has_previous = function() { return pos > 0 }
		instance.has_next = function() { return pos < (pages.length-1) }

		$lightbox_next.click(function() {
			if(instance.show_next() == false) {
				instance.hide();
			}
		});
		$lightbox_prev.click(instance.show_previous);
		$lightbox_close.click(instance.hide);
		lightboximg.on("load", function() {
			if(instance.has_next()) {
				$lightbox_next.removeClass('disabled');
			}
			else {
				$lightbox_next.addClass('disabled');
			}
			if(instance.has_previous()) {
				$lightbox_prev.removeClass('disabled');
			}
			else {
				$lightbox_prev.addClass('disabled');
			}
		});

		lightbox.fadeOut(0);
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
			var e = $("button[value=Next], a.button-link:contains('Next'), a.button.next, .button a.next, button.button:contains('Next')")
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
			$(".submission-artist-container a").each(function(i, self) {
				var r = self.pathname.match("^/user/(.+)")
				if(r && r[1]) {
					window.location.href = `/gallery/${r[1]}`;
					return false;
				}
			})
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
				e[0].click();
				return false;
			}
		}
	},
	"lightbox": {
		27: function() { return Slideshow().hide() },          // [ESC]
		83: function() { return Slideshow().hide() },          // S
		79: function() { return Slideshow().open() },          // O
		13: function() { return Slideshow().open() },          // [Return]
		35: function() { return Slideshow().show_last() },     // [End]
		36: function() { return Slideshow().show_first() },    // [Home]
		37: function() { return Slideshow().show_previous() }, // [<-]
		39: function() { return Slideshow().show_next() },     // [->]
			
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
