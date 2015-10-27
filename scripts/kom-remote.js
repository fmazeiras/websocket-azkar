require=function t(e,i,n){function o(r,a){if(!i[r]){if(!e[r]){var u="function"==typeof require&&require;if(!a&&u)return u(r,!0);if(s)return s(r,!0);var d=new Error("Cannot find module '"+r+"'");throw d.code="MODULE_NOT_FOUND",d}var f=i[r]={exports:{}};e[r][0].call(f.exports,function(t){var i=e[r][1][t];return o(i?i:t)},f,f.exports,t,e,i,n)}return i[r].exports}for(var s="function"==typeof require&&require,r=0;r<n.length;r++)o(n[r]);return o}({1:[function(t,e,i){(function(t){"use strict";!function(e,n){var o="object"==typeof self&&self.self==self&&self||"object"==typeof t&&t.global==t&&t;if("function"==typeof define&&define.amd)define(["jquery"],function(t){return o[e]=n(o,i,t)});else if("undefined"!=typeof i){var s;try{s="undefined"!=typeof window?window.jQuery:"undefined"!=typeof t?t.jQuery:null}catch(r){}i=n(o,s)}else o[e]=n(o,o.jQuery||o.Zepto||o.ender||o.$)}("Joystick",function(t,e,i){function n(t){return Math.pow(t,2)*(t?0>t?-1:1:0)}function o(t,i){this.$element=t,this.settings=e.extend({},r,i),this.init()}var s="joystick",r={radiusMax:50},a=e(document);return o.prototype.init=function(){return this.$element.off("mousedown."+s).on("mousedown."+s,e.proxy(o.prototype.onmousedown,this)),this},o.prototype.destroy=function(){this.$element.off("mousedown."+s),a.off("mouseup."+s+" mousemove."+s)},o.prototype.move=function(t,e){var i=Math.sqrt(t*t+e*e);if(i>this.settings.radiusMax){var n=t/i,o=e/i;t=Math.round(n*this.settings.radiusMax),e=Math.round(o*this.settings.radiusMax)}return this.$element.css("transform","translate("+t+"px,"+e+"px)"),this.trigger(t,e),this},o.prototype.trigger=function(t,e){var i=new CustomEvent(s+":move",{bubbles:!0,detail:{x:t,y:e,ratioX:Math.round(n(t)/n(this.settings.radiusMax)*100)/100,ratioY:Math.round(n(e)/n(this.settings.radiusMax)*100)/100}});this.$element[0].dispatchEvent(i)},o.prototype.onmousedown=function(t){this.position={x:t.clientX,y:t.clientY},this.$element.css("transition","0s"),a.off("mousemove."+s+" mouseup."+s).on("mousemove."+s,e.proxy(o.prototype.onmousemove,this)).on("mouseup."+s,e.proxy(o.prototype.onmouseup,this))},o.prototype.onmousemove=function(t){var e=t.clientX-this.position.x,i=t.clientY-this.position.y;this.move(e,i)},o.prototype.onmouseup=function(){a.off("mousemove."+s+" mouseup."+s),this.$element.css("transition",""),this.move(0,0)},e.fn[s]=function(t){return this.each(function(){var i=e(this);e.data(i,"plugin_"+s)||e.data(i,"plugin_"+s,new o(i,t))})},o})}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],2:[function(t,e,i){(function(t){"use strict";!function(e,n){var o="object"==typeof self&&self.self==self&&self||"object"==typeof t&&t.global==t&&t;if("function"==typeof define&&define.amd)define(["jquery"],function(t){return o[e]=n(o,i,t)});else if("undefined"!=typeof i){var s;try{s="undefined"!=typeof window?window.jQuery:"undefined"!=typeof t?t.jQuery:null}catch(r){}i=n(o,s)}else o[e]=n(o,o.jQuery||o.Zepto||o.ender||o.$)}("Pad",function(t,e,i){function n(t,i){this.$element=t,this.settings=e.extend({},s,i),this.init()}var o="pad",s={},r=e(document);return n.prototype.init=function(){return this.$element.off("mousedown."+o,".pad-arrow").on("mousedown."+o,".pad-arrow",e.proxy(n.prototype.onmousedown,this)),this},n.prototype.destroy=function(){this.$element.off("mousedown."+o,".pad-arrow"),r.off("mouseup."+o+" mousemove."+o)},n.prototype.onmousedown=function(t){r.off("mouseup."+o).on("mouseup."+o,e.proxy(n.prototype.onmouseup,this));var i=e(t.target).data("direction");return this.trigger(i),this},n.prototype.trigger=function(t){var e=new CustomEvent(o+":pressed",{bubbles:!0,detail:{direction:t||"none"}});return this.$element[0].dispatchEvent(e),this},n.prototype.onmouseup=function(){r.off("mouseup."+o),this.trigger()},e.fn[o]=function(t){return this.each(function(){var i=e(this);e.data(i,"plugin_"+o)||e.data(i,"plugin_"+o,new n(i,t))})},n})}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],3:[function(t,e,i){(function(t){"use strict";var i={round:function(t,e){var i=Math.pow(10,e||0);return Math.round(t*i)/i},bound:function(t,e,i){return Math.min(Math.max(t,e),i)},min:function(t,e){var i=Math.min(t,e);return i*=t?t/Math.abs(t):1},extend:function(t,e){t=t||{};for(var i in e)"object"==typeof e[i]?t[i]=this.extend(t[i],e[i]):t[i]=e[i];return t}},n=i.Animator=function(t){this.interval=t||16,this.id=null};n.prototype.cancel=function(){return this.id&&t.clearTimeout(this.id),this},n.prototype.execute=function(e){this.cancel(),e()!==!1&&(this.id=t.setTimeout(this.execute.bind(this,e),this.interval))},e.exports=i}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],"differential-drive":[function(t,e,i){(function(i){"use strict";function n(t,e){var i=this.settings=o.extend(o.extend({},s),e);this.session=t,this.animator=new o.Animator(i.interval),this._set(i.linear,i.radial)}var o=t("./utils.js"),s={linear:0,radial:0,linearMin:-1,linearMax:1,radialMin:-1,radialMax:1,interval:16,acceleration:1e3,rpcMethod:"com.kompai2.drive"};n.prototype.getValues=function(){return[this.linear,this.radial].map(function(t){return o.round(t,4)})},n.prototype.update=function(t,e){var i=this._getBoundedUpdate(t,e);this.animator.execute(function(){return i(),this.send(),!!this.linear||!!this.radial}.bind(this))},n.prototype.send=function(){if(i.DEBUG_SAFE||this.session.call(this.settings.rpcMethod,this.getValues()),i.DEBUG||i.DEBUG_SAFE){var t=this.getValues();console.log("DifferentialDrive [%f, %f]",t[0],t[1])}return this},n.prototype._getBoundedUpdate=function(t,e){var i=(t-this.linear)/(this.settings.acceleration/this.settings.interval),n=(e-this.radial)/(this.settings.acceleration/this.settings.interval);return function(){var o=this.linear+i,s=this.radial+n;return o=(t-o)*(t-this.linear)<=0?t:o,s=(e-s)*(e-this.radial)<=0?e:s,this._set(o,s)}.bind(this)},n.prototype._set=function(t,e){return t=void 0===t||isNaN(e)?this.linear||0:t,e=void 0===t||isNaN(e)?this.radial||0:e,this.linear=o.bound(t,this.settings.linearMin,this.settings.linearMax),this.radial=o.bound(e,this.settings.radialMin,this.settings.radialMax),this},e.exports=n}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{"./utils.js":3}],"kom-remote":[function(t,e,i){(function(i){"use strict";var n,o=t("differential-drive");document.addEventListener("DOMContentLoaded",function(){n="undefined"!=typeof window?window.jQuery:"undefined"!=typeof i?i.jQuery:null,t("./jquery.joystick.js"),t("./jquery.pad.js")});var s=document.currentScript.ownerDocument.querySelector("#kom-remote"),r=Object.create(HTMLElement.prototype);r.init=function(){this.$element=n(this);var t=this.$shadow=n(this.shadowRoot),e=t.find(".joystick"),i=Math.min(e.innerWidth(),e.outerWidth())/2;return this.$joystick=t.find(".joystick-stick").joystick({radiusMax:i}),this.$pad=t.find(".pad").pad(),this.$switch=t.find("input[name=switch-remote]"),this.$switch.on("change.komremote",this.onswitch.bind(this)),this},r.destroy=function(){return this.$element.off("joystick:move.komremote pad:pressed.komremote"),this.$switch.off("change.komremote"),this.$joystick.data("joystick").destroy(),this.$pad.data("joystick").destroy(),this},r.start=function(t){return this.differentialDrive=new o(t,{acceleration:500}),this.$element.on("joystick:move.komremote",this.onjoystickmove.bind(this)),this.$element.on("pad:pressed.komremote",this.onpadpressed.bind(this)),this},r.onjoystickmove=function(t){var e=t.originalEvent.detail;this.differentialDrive.update(-e.ratioY/2,-e.ratioX)},r.onpadpressed=function(t){switch(t.originalEvent.detail.direction){case"top":this.differentialDrive.update(.2,0);break;case"right":this.differentialDrive.update(0,-.2);break;case"bottom":this.differentialDrive.update(-.2,0);break;case"left":this.differentialDrive.update(0,.2);break;default:this.differentialDrive.update(0,0)}},r.onswitch=function(t){var e=t.target.value;switch(e){case"pad":this.$element.addClass("is-pad");break;case"joystick":default:this.$element.removeClass("is-pad")}return this},r.createdCallback=function(){var t=document.importNode(s.content,!0);return this.createShadowRoot().appendChild(t),document.addEventListener("DOMContentLoaded",this.init.bind(this)),this},e.exports=r}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{"./jquery.joystick.js":1,"./jquery.pad.js":2,"differential-drive":"differential-drive"}]},{},[]);