function t(){}function e(t){return t()}function n(){return Object.create(null)}function o(t){t.forEach(e)}function r(t){return"function"==typeof t}function c(t,e){return t!=t?e==e:t!==e||t&&"object"==typeof t||"function"==typeof t}function s(t,e){t.appendChild(e)}function a(t,e,n){t.insertBefore(e,n||null)}function i(t){t.parentNode.removeChild(t)}function u(t){return document.createElement(t)}function l(t){return document.createTextNode(t)}let d;function f(t){d=t}const h=[],p=[],$=[],m=[],g=Promise.resolve();let y=!1;function x(t){$.push(t)}function b(){const t=new Set;do{for(;h.length;){const t=h.shift();f(t),_(t.$$)}for(;p.length;)p.pop()();for(let e=0;e<$.length;e+=1){const n=$[e];t.has(n)||(n(),t.add(n))}$.length=0}while(h.length);for(;m.length;)m.pop()();y=!1}function _(t){t.fragment&&(t.update(t.dirty),o(t.before_update),t.fragment.p(t.dirty,t.ctx),t.dirty=null,t.after_update.forEach(x))}const v=new Set;function w(t,e){t.$$.dirty||(h.push(t),y||(y=!0,g.then(b)),t.$$.dirty=n()),t.$$.dirty[e]=!0}function C(c,s,a,i,u,l){const h=d;f(c);const p=s.props||{},$=c.$$={fragment:null,ctx:null,props:l,update:t,not_equal:u,bound:n(),on_mount:[],on_destroy:[],before_update:[],after_update:[],context:new Map(h?h.$$.context:[]),callbacks:n(),dirty:null};let m=!1;var g,y;$.ctx=a?a(c,p,(t,e,n=e)=>($.ctx&&u($.ctx[t],$.ctx[t]=n)&&($.bound[t]&&$.bound[t](n),m&&w(c,t)),e)):p,$.update(),m=!0,o($.before_update),$.fragment=i($.ctx),s.target&&(s.hydrate?$.fragment.l(function(t){return Array.from(t.childNodes)}(s.target)):$.fragment.c(),s.intro&&((g=c.$$.fragment)&&g.i&&(v.delete(g),g.i(y))),function(t,n,c){const{fragment:s,on_mount:a,on_destroy:i,after_update:u}=t.$$;s.m(n,c),x(()=>{const n=a.map(e).filter(r);i?i.push(...n):o(n),t.$$.on_mount=[]}),u.forEach(x)}(c,s.target,s.anchor),b()),f(h)}let E;function H(e){var n,o,r;return{c(){n=u("h1"),o=l("Hi! my name is "),r=l(k),this.c=t},m(t,e){a(t,n,e),s(n,o),s(n,r)},p:t,i:t,o:t,d(t){t&&i(n)}}}"undefined"!=typeof HTMLElement&&(E=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"})}connectedCallback(){for(const t in this.$$.slotted)this.appendChild(this.$$.slotted[t])}attributeChangedCallback(t,e,n){this[t]=n}$destroy(){var e,n;n=1,(e=this).$$.fragment&&(o(e.$$.on_destroy),e.$$.fragment.d(n),e.$$.on_destroy=e.$$.fragment=null,e.$$.ctx={}),this.$destroy=t}$on(t,e){const n=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return n.push(e),()=>{const t=n.indexOf(e);-1!==t&&n.splice(t,1)}}$set(){}});let k="Svelte Component1";class M extends E{constructor(t){super(),this.shadowRoot.innerHTML="<style>h1{color:red}</style>",C(this,{target:this.shadowRoot},null,H,c,[]),t&&t.target&&a(t.target,this,t.anchor)}}function S(e){var n,o,r;return{c(){n=u("h1"),o=l("Hi! my name is "),r=l(T),this.c=t},m(t,e){a(t,n,e),s(n,o),s(n,r)},p:t,i:t,o:t,d(t){t&&i(n)}}}customElements.define("sv-comp1",M);let T="Svelte Component2";class L extends E{constructor(t){super(),this.shadowRoot.innerHTML="<style>h1{color:blue}</style>",C(this,{target:this.shadowRoot},null,S,c,[]),t&&t.target&&a(t.target,this,t.anchor)}}customElements.define("sv-comp2",L);export{M as Component1,L as Component2};
