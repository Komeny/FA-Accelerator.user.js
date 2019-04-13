// ==UserScript==
// @name        FA Keyboard Accelerators
// @namespace   example.com
// @include     https://www.furaffinity.net/*
// @include     https://furaffinity.net/*
// @include     http://www.furaffinity.net/*
// @include     http://furaffinity.net/*
// @version     28
// @downloadURL https://raw.githubusercontent.com/Komeny/FA-Accelerator.user.js/master/FA_Keyboard_Accelerators.user.js
// @grant       GM.xmlhttpRequest
// @grant       GM.openInTab
// @require     http://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js
// ==/UserScript==

var keymap = "basic"

var css_body = `
`

var css_lightbox = `
	.fa_accelerate_lightbox {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		display: flex;
		flex-direction: column;
		background-color: rgba(0, 0, 0, 0.9);
		z-index: 1000001;
	}
	.fa_accelerate_lightbox .progress-bar {
		width: 30%;
		height: 4px;
		background-color: rgba(0, 255, 217, 0.7);
		transition: width 0.3s ease-out;
	}
	.fa_accelerate_lightbox .action-bar {
		display: flex;
		justify-content: space-between;
	}
	.fa_accelerate_lightbox .action-bar .lightbox_btn {
		padding: 10px;
	}
	.fa_accelerate_lightbox .image-container {
		position: relative;
		display: flex;
		flex: 1;
		min-height: 1px;
		justify-content: center;
		align-items: center;
		padding: 0 10px 10px;
	}
	.fa_accelerate_lightbox .image-container img {
		max-width: 100%;
		max-height: 100%;
		box-shadow: 0 0 100px #000;
		z-index: -3;
	}
	.fa_accelerate_lightbox .lightbox_btn {
		opacity: 0.5;
		color: #fff;
		line-height: 1;
		transition: opacity 0.15s ease-in-out;
		outline: 0;
	}
	.fa_accelerate_lightbox .lightbox_btn:hover,
	.fa_accelerate_lightbox .lightbox_btn:focus {
		opacity: 1;
	}
	.fa_accelerate_lightbox .lightbox_btn.lightbox_nav {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 30%;
		filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.3));
	}
	.fa_accelerate_lightbox .lightbox_btn.lightbox_nav span {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
	}
	.fa_accelerate_lightbox .lightbox_btn.lightbox_nav.lightbox_prev {
		left: 0;
	}
	.fa_accelerate_lightbox .lightbox_btn.lightbox_nav.lightbox_prev span {
		left: 50px;
	}
	.fa_accelerate_lightbox .lightbox_btn.lightbox_nav.lightbox_next {
		right: 0;
	}
	.fa_accelerate_lightbox .lightbox_btn.lightbox_nav.lightbox_next span {
		right: 50px;
	}
	.fa_accelerate_lightbox .lightbox_btn.active {
		opacity: 1;
	}
	.fa_accelerate_lightbox .lightbox_btn.disabled {
		cursor: default !important;
		opacity: 0.2 !important;
	}
	.fa_accelerate_lightbox .icon {
		display: inline-block;
		width: 50px;
		height: 34px;
		fill: #fff;
	}
	.fa_accelerate_lightbox .icon.icon-artist {
		position: relative;
		height: 40px;
		top: -3px;
	}

	.fa_accelerate_lightbox .icon.icon-gallery {
		width: 88px;
	}

	.fa_accelerate_lightbox .icon.icon-prev,
	.fa_accelerate_lightbox .icon.icon-next {
		width: 32px;
		height: auto;
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

		const protocol = window.location.protocol
		// private members
		var pos = 0;

		// Prefetch images
		var pages = $(".browse,.gallery,.messagecenter").find("figure.t-image")
			.map(function(i, e) {
				var src = $(e).find("img").attr("src")
				var r = src.match(/^(\/\/t\.facdn\.net)\/(\d+)@\d+-(\d+.*)/);
				var id = `${protocol}${r[1]}/${r[2]}@1280-${r[3]}`
				
				Prefetcher().request(id, () => true );
				return {
					url: id,
					sub_ele: e,
					sub_id: r[2],
					sub_url: `${protocol}//www.furaffinity.net/view/${r[2]}/`,
					sub_box: $(`#input-${r[2]}`)
				};
			}).toArray();

		// initialisations
		lightbox = $(`
		<div id="fa_accelerate_lightbox" class="fa_accelerate_lightbox">
			<svg style="position: absolute; width: 0; height: 0; overflow: hidden" version="1.1"
					xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
				<defs>
					<symbol id="icon-artist" viewBox="0 0 34 32">
						<path d="M13.497 14.978c-0.611 0.834-1.195 1.78-1.701 2.772l-0.055
							0.118s2.688 0.231 4.089-0.571c0 0.043-0.939-4.003-2.334-2.319z"></path>
						<path d="M20.657 13.135c0.692-1.826 1.092-3.937 1.092-6.142
							0-1.571-0.203-3.094-0.585-4.546l0.028 0.124c-0.296 1.033-1.445
							6.026-2.789 6.662-0.188-0.86-2.168-3.107-4.422-4.227 0.299 1.381 0.555
							3.084 0.71 4.816l0.012 0.17c-8.8 2.168-2.276 5.527-9.638 7.225-2.514
							0.585-5.058 0.116-5.058 2.319 0 3.439 7.796 7.348 17.001 6.979
							1.64-0.065 1.64-0.065 3.656-3.837-3.128 3.446-13.157 1.3-15.743
							0.137-2.030-0.903-3.938-3.23-2.753-3.417 13.634-2.081 1.445-6.82
							16.618-8.67 0.791 0.642 1.424 1.447 1.854 2.365l0.017 0.041z"></path>
						<path d="M21.574 0c6.503 5.578 6.091 19.081 8.576 22.159 0
							0-4.111-0.578-4.335-0.311s0 3.995 0 3.995-4.386 0-4.718 0.166 0.144
							5.975 0.152 5.99 1.264-3.54 1.835-3.757 5.527 1.618 5.527 1.618 0-4.27
							0.238-4.624 3.1-0.802
							5.007-0.361c-4.407-7.919-4.234-20.194-12.283-24.876z"></path>
					</symbol>
					<symbol id="icon-check" viewBox="0 0 44 32">
						<path d="M4.772 16.93c0 0.61 10.895 10.241 12.885 11.548 1.090 0.726
							17.024-18.158 21.187-24.978 0 0-19.291 18.027-20.765
							18.056s-8.454-8.244-8.948-8.97c-0.726-1.017-4.358 3.733-4.358
							4.343z"></path>
					</symbol>
					<symbol id="icon-close" viewBox="0 0 30 32">
						<path d="M27.032
							28.75c-3.704-3.502-7.020-7.34-9.924-11.488l-0.159-0.24c4.222-3.783
							8.125-7.605 8.125-8.824-0.315-1.131-0.826-2.117-1.499-2.968l0.014
							0.018c-1.392 2.344-4.595 6.047-8.125
							9.65-4.642-6.8-7.546-12.261-8.984-11.595-1.4 0.685-2.554 1.683-3.404
							2.908l-0.019 0.029c3.216 4.081 6.45 7.719 9.884
							11.157l-0.001-0.001c-2.278 2.251-4.704 4.367-7.257 6.326l-0.182 0.134c0
							0.493 0 2.444 0.979 1.958 0.2-0.1 3.996-3.17 8.132-6.74 4.129 4.036
							8.671 7.899 12.421 9.677z"></path>
					</symbol>
					<symbol id="icon-gallery" viewBox="0 0 81 32">
						<path d="M70.227
							9.303c-0.715-0.586-10.59-0.965-16.276-0.872-0.079-1.973-0.229-3.339-0.465-3.54-0.98-0.808-25.235-1.23-25.929-0.543-0.179 0.179-0.272 1.445-0.272 3.232-5.635-0.093-15.896 0.293-16.626 0.887-0.98 0.815-0.458 14.795 0.286 15.56s2.438 0.315 13.229-0.057c0 0-8.645-1.087-9.403-3.089-0.272-0.715-0.858-10.548 0-11.234s11.734-0.558 12.299 0c0.059 0.045 0.133 0.073 0.213 0.079l0.001 0c0.057 6.035 0.586 15.017 1.087 15.524 0.715 0.715 2.71 1.387 2.682 0.715-0.286-7.151-0.2-19.386 0.35-19.936s17.162-0.715 18.013 0 0.243 17.663 0 18.385c-0.715 2.002-15.124 3.089-15.124 3.089 10.791 0.372 18.213 0.801 18.957 0.057 0.508-0.515 0.915-10.633 0.801-17.162 1.43-0.494 11.341-0.586 12.157 0.071s0.236 10.505 0 11.227c-0.715 2.009-9.396 3.096-9.396 3.096 10.791 0.372 12.485 0.794 13.229 0.050s1.173-14.731 0.186-15.539z"></path>
					</symbol>
					<symbol id="icon-next" viewBox="0 0 16 32">
						<path d="M3.102 0c1.206 0 12.677 14.49 12.677 15.696s-4.833 7.852-13.883 16.304c0 0 9.026-13.284 9.026-14.49 0-0.886-4.857-7.138-10.864-12.677-0.517-0.5 1.838-4.833 3.044-4.833z"></path>
					</symbol>
					<symbol id="icon-prev" viewBox="0 0 16 32">
						<path d="M12.677 0c-1.19 0-12.677 14.49-12.677 15.696s4.833 7.852 13.883 16.304c0 0-9.026-13.284-9.026-14.49 0-0.886 4.857-7.138 10.864-12.677 0.517-0.5-1.838-4.833-3.044-4.833z"></path>
					</symbol>
					<symbol id="icon-trash" viewBox="0 0 23 32">
						<path d="M0.689 11.050c-0.865 0.865 2.425 16.539 3.29 17.403s3.664 1.348 3.415 0.63c-2.741-8.676-3.503-14.047-2.865-14.655 0.271-0.271 3.217 0 5.188-0.059-0.003 0.205-0.005 0.446-0.005 0.688 0 3.916 0.475 7.722 1.37 11.362l-0.068-0.325c0.313-4.373 0.89-8.384 1.73-12.298l-0.103 0.574c1.817 0.051 4.888 0.132 5.261 0.44 0.975 0.799-2.264 13.19-2.425 14.098-0.256 1.385-7.232 2.77-7.232 2.77 9.731 1.026 9.526-0.484 9.658-0.85 0.366-1.172 4.397-18.004 3.253-18.949s-19.689-1.619-20.466-0.828z"></path>
						<path d="M22.914 6.294c-0.931-0.337-4.008-1.378-7.606-2.513v0c0.235-0.85-1.348-2.235-2.667-2.601s-1.993 0.191-2.198 1.033c0 0 0 0 0 0.051-4.712-1.4-8.976-2.543-9.343-2.206-0.799 0.718-1.656 3.825-0.63 3.862 7.379 0.271 21.126 5.642 22.371 7.232 0.689-3.744 0.784-4.558 0.073-4.858z"></path>
					</symbol>
					<symbol id="icon-tab" viewBox="0 0 37 32">
						<path d="M32.134 4.428c-1.028-0.842-26.296-1.281-27.011-0.566s-1.557 20.344-0.782 21.119 4.402 1.438 4.38 0.745c-0.298-7.412-0.179-19.525 0.387-20.113s17.878-0.745 18.772 0 0.253 18.4 0 19.152c-0.79 2.086-15.755 3.218-15.755 3.218 11.241 0.387 18.966 0.834 19.74 0.060s1.289-22.765 0.268-23.614z"></path>
						<path d="M14.129 17.658c-0.432-4.097-0.194-7.948 0.097-8.194s8.12-0.804 8.12-0.804c-6.146-1.043-10.131-0.954-10.518-0.581s-0.864 9.386-0.409 9.87 2.749 0.104 2.711-0.291z"></path>
					</symbol>
					<symbol id="icon-zoom" viewBox="0 0 33 32">
						<path d="M6.49 6.1c7.887-6.296 20.765-3.597 15.639 13.599-0.258 0.802 8.499 7.778 7.704 8.35-0.598 0.415-1.775 1.095-2.319 0.932-0.68-0.204-9.519-7.921-8.975-8.506 4.651-5.236-0.49-19.99-9.886-13.83-6.242 4.12-0.761 14.361 7.622 15.156-9.852 2.727-18.039-9.132-9.784-15.7z"></path>
					</symbol>
				</defs>
			</svg>
			<div class="progress-bar"></div>
			<div class="action-bar">
				<a class="lightbox_btn lightbox_zoom disabled" href="#" title="Zoom [Z]">
					<svg class="icon icon-zoom"><use xlink:href="#icon-zoom"></use></svg>
				</a>
				<a class="lightbox_btn lightbox_open" href="#" title="Open in new Tab [O]">
					<svg class="icon icon-tab"><use xlink:href="#icon-tab"></use></svg>
				</a>
				<a class="lightbox_btn lightbox_artist disabled" href="#" title="Artist [A]">
					<svg class="icon icon-artist"><use xlink:href="#icon-artist"></use></svg>
				</a>
				<a class="lightbox_btn lightbox_gallery disabled" href="#" title="Gallery [G]">
					<svg class="icon icon-gallery"><use xlink:href="#icon-gallery"></use></svg>
				</a>
				<a class="lightbox_btn lightbox_check" href="#" title="Select image [Return]">
					<svg class="icon icon-check"><use xlink:href="#icon-check"></use></svg>
				</a>
				<a class="lightbox_btn lightbox_trash disabled" href="#" title="Remove selected [Del]">
					<svg class="icon icon-trash"><use xlink:href="#icon-trash"></use></svg>
				</a>
				<a class="lightbox_btn lightbox_close" href="#" title="Close [Esc]">
					<svg class="icon icon-close"><use xlink:href="#icon-close"></use></svg>
				</a>
			</div>
			<div class="image-container">
				<img />
				<a class="lightbox_btn lightbox_nav lightbox_prev" href="#" title="Previous Image">
					<span><svg class="icon icon-prev"><use xlink:href="#icon-prev"></use></svg></span>
				</a>
				<a class="lightbox_btn lightbox_nav lightbox_next disabled" href="#" title="Next Image">
					<span><svg class="icon icon-next"><use xlink:href="#icon-next"></use></svg></span>
				</a>
			</div>
		</div>
		`);
		lightbox.appendTo($("body"))
		$("body").append("<style>" + css_lightbox + "</style>")

		var $lightboximg = lightbox.find(".image-container img")
		var $lightbox_next  = $("#fa_accelerate_lightbox .lightbox_next");
		var $lightbox_prev  = $("#fa_accelerate_lightbox .lightbox_prev");
		var $lightbox_close = $("#fa_accelerate_lightbox .lightbox_close");
		var $lightbox_check = $("#fa_accelerate_lightbox .lightbox_check");
		var $lightbox_trash = $("#fa_accelerate_lightbox .lightbox_trash");
		var $progressbar = $("#fa_accelerate_lightbox .progress-bar");

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
				$lightboximg.attr("src", pages[pos1].url);
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
		instance.mark = function() {
			pages[pos].sub_box.prop('checked', true);
			instance.go(pos); // redraw
			return false;
		}
		instance.mark_toggle = function() {
			pages[pos].sub_box.click(); // there's a click handler on element
			instance.go(pos); // redraw
			return false;
		}
		instance.mark_all = function() {
			$("button.check-uncheck").click();
			instance.go(pos); // redraw
			return false;
		}
		instance.mark_none = function() {
			$(".browse,.gallery,.messagecenter").
				find("figure input[checked]").click()
			instance.go(pos); // redraw
			return false;
		}
		instance.remove_marked = function() {
			// Collect marked
			var f = new FormData();
			var pages1 = pages;
			f.append('messagecenter-action', 'remove_checked')
			var p = pages1.forEach(function(e, k) {
				if(e.sub_box.prop('checked')) {
					f.append('submissions[]', e.sub_id);
					$(e.sub_ele).remove();
					pages1.splice(k, 1);
				}
			});
			
			// Send POST to FA to remove marked
			GM_xmlhttpRequest({
				url: `http://www.furaffinity.net/msg/submissions/`,
				method: 'POST',
				data: f,
			});
			pages = pages1;
			instance.mark_none();
			instance.go(0);    // Cause "redraw" of Lightbox
			return false;
		}
		instance.has_previous = () => pos > 0
		instance.has_next = () => pos < (pages.length-1)
		instance.is_marked = () => !!pages[pos].sub_box.prop('checked')
		if((window.location+'').match(/\/msg\/submissions\//)) {
			instance.can_mark = () => true;
		}
		else {
			instance.can_mark = () => false;
		}

		$lightbox_next.click(function() {
			if(instance.show_next() == false) {
				instance.hide();
			}
		});
		$lightbox_prev.click(instance.show_previous);
		$lightbox_close.click(instance.hide);
		$lightbox_trash.click(instance.remove_marked);
		$lightboximg.on("load", function() {
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

			if(instance.is_marked())
				$lightbox_check.addClass('active');
			else
				$lightbox_check.removeClass('active');

		});

		lightbox.fadeOut(0);
		return instance;
	};
})();

var keymappings = {
	"basic" : {
		45: function() { return Slideshow().mark_all() },      // [Insert]
		46: function() { return $("button.remove-checked").click() || false }, // [Del]
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
		38: function() { return Slideshow().open() },          // [^]
		35: function() { return Slideshow().show_last() },     // [End]
		36: function() { return Slideshow().show_first() },    // [Home]
		37: function() { return Slideshow().show_previous() }, // [<-]
		39: function() { return Slideshow().show_next() },     // [->]
		46: function() { return Slideshow().remove_marked() }, // [Del]
		13: function() { return Slideshow().mark_toggle() },   // [Enter]
		32: function() { return Slideshow().mark_toggle() },   // [Blank]
		45: function() { return Slideshow().mark_all() },      // [Insert]
		190:function() { return Slideshow().mark() },          // [.]
			
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
