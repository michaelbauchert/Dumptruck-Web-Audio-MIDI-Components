(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.SvelteComponent = {}));
}(this, (function (exports) { 'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    let SvelteElement;
    if (typeof HTMLElement === 'function') {
        SvelteElement = class extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
                // @ts-ignore todo: improve typings
                for (const key in this.$$.slotted) {
                    // @ts-ignore todo: improve typings
                    this.appendChild(this.$$.slotted[key]);
                }
            }
            attributeChangedCallback(attr, _oldValue, newValue) {
                this[attr] = newValue;
            }
            $destroy() {
                destroy_component(this, 1);
                this.$destroy = noop;
            }
            $on(type, callback) {
                // TODO should this delegate to addEventListener?
                const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
                callbacks.push(callback);
                return () => {
                    const index = callbacks.indexOf(callback);
                    if (index !== -1)
                        callbacks.splice(index, 1);
                };
            }
            $set($$props) {
                if (this.$$set && !is_empty($$props)) {
                    this.$$.skip_bound = true;
                    this.$$set($$props);
                    this.$$.skip_bound = false;
                }
            }
        };
    }

    /* src\Knob.svelte generated by Svelte v3.26.0 */

    function create_fragment(ctx) {
    	let label;
    	let t0;
    	let label_for_value;
    	let t1;
    	let div0;
    	let slot;
    	let div0_id_value;
    	let div0_name_value;
    	let t2;
    	let div1;
    	let span;
    	let t3_value = /*value*/ ctx[2].toFixed(/*decimalPlaces*/ ctx[5]) + " " + /*unit*/ ctx[4] + "";
    	let t3;
    	let t4;
    	let input;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			label = element("label");
    			t0 = text(/*name*/ ctx[3]);
    			t1 = space();
    			div0 = element("div");
    			slot = element("slot");

    			slot.innerHTML = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g><circle cx="50" cy="50" r="50"></circle><rect style="width: var(--indicator-width); 
						  height:var(--indicator-height); 
						  x: calc(50% - var(--indicator-width) / 2);"></rect></g></svg>`;

    			t2 = space();
    			div1 = element("div");
    			span = element("span");
    			t3 = text(t3_value);
    			t4 = space();
    			input = element("input");
    			this.c = noop;
    			attr(label, "for", label_for_value = slugify(/*name*/ ctx[3]));
    			attr(div0, "role", "slider");
    			attr(div0, "class", "wrapper");
    			attr(div0, "id", div0_id_value = slugify(/*name*/ ctx[3]));
    			attr(div0, "name", div0_name_value = slugify(/*name*/ ctx[3]));
    			attr(div0, "tabindex", "0");
    			attr(div0, "draggable", "false");
    			set_style(div0, "--knob-rotation", /*normalvalue*/ ctx[9] * 300 - 150 + "deg");
    			set_style(div0, "--normal", /*normalvalue*/ ctx[9]);
    			set_style(div0, "--normal-rotation", Math.abs(/*normalvalue*/ ctx[9] * 2 - 1));
    			attr(div0, "aria-valuemin", /*min*/ ctx[0]);
    			attr(div0, "aria-valuemax", /*max*/ ctx[1]);
    			attr(div0, "aria-valuenow", /*value*/ ctx[2]);
    			attr(span, "role", "presentation");
    			toggle_class(span, "unfocused", /*unfocused*/ ctx[8]);
    			attr(input, "type", "number");
    			attr(input, "name", /*name*/ ctx[3]);
    			attr(input, "min", /*min*/ ctx[0]);
    			attr(input, "max", /*max*/ ctx[1]);
    			attr(input, "tabindex", "-1");
    			toggle_class(input, "unfocused", /*unfocused*/ ctx[8]);
    			attr(div1, "id", "number-input");
    		},
    		m(target, anchor) {
    			insert(target, label, anchor);
    			append(label, t0);
    			insert(target, t1, anchor);
    			insert(target, div0, anchor);
    			append(div0, slot);
    			/*div0_binding*/ ctx[23](div0);
    			insert(target, t2, anchor);
    			insert(target, div1, anchor);
    			append(div1, span);
    			append(span, t3);
    			append(div1, t4);
    			append(div1, input);
    			/*input_binding*/ ctx[24](input);

    			if (!mounted) {
    				dispose = [
    					listen(div0, "pointerdown", /*beginKnobTurn*/ ctx[10]),
    					listen(div0, "pointerup", /*endKnobTurn*/ ctx[11]),
    					listen(div0, "dblclick", /*setToDefault*/ ctx[12]),
    					listen(div0, "keydown", /*handleKeyDown*/ ctx[13]),
    					listen(span, "click", /*handleClick*/ ctx[14]),
    					listen(input, "keyup", /*submitInput*/ ctx[15]),
    					listen(input, "blur", /*handleBlur*/ ctx[16])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*name*/ 8) set_data(t0, /*name*/ ctx[3]);

    			if (dirty[0] & /*name*/ 8 && label_for_value !== (label_for_value = slugify(/*name*/ ctx[3]))) {
    				attr(label, "for", label_for_value);
    			}

    			if (dirty[0] & /*name*/ 8 && div0_id_value !== (div0_id_value = slugify(/*name*/ ctx[3]))) {
    				attr(div0, "id", div0_id_value);
    			}

    			if (dirty[0] & /*name*/ 8 && div0_name_value !== (div0_name_value = slugify(/*name*/ ctx[3]))) {
    				attr(div0, "name", div0_name_value);
    			}

    			if (dirty[0] & /*normalvalue*/ 512) {
    				set_style(div0, "--knob-rotation", /*normalvalue*/ ctx[9] * 300 - 150 + "deg");
    			}

    			if (dirty[0] & /*normalvalue*/ 512) {
    				set_style(div0, "--normal", /*normalvalue*/ ctx[9]);
    			}

    			if (dirty[0] & /*normalvalue*/ 512) {
    				set_style(div0, "--normal-rotation", Math.abs(/*normalvalue*/ ctx[9] * 2 - 1));
    			}

    			if (dirty[0] & /*min*/ 1) {
    				attr(div0, "aria-valuemin", /*min*/ ctx[0]);
    			}

    			if (dirty[0] & /*max*/ 2) {
    				attr(div0, "aria-valuemax", /*max*/ ctx[1]);
    			}

    			if (dirty[0] & /*value*/ 4) {
    				attr(div0, "aria-valuenow", /*value*/ ctx[2]);
    			}

    			if (dirty[0] & /*value, decimalPlaces, unit*/ 52 && t3_value !== (t3_value = /*value*/ ctx[2].toFixed(/*decimalPlaces*/ ctx[5]) + " " + /*unit*/ ctx[4] + "")) set_data(t3, t3_value);

    			if (dirty[0] & /*unfocused*/ 256) {
    				toggle_class(span, "unfocused", /*unfocused*/ ctx[8]);
    			}

    			if (dirty[0] & /*name*/ 8) {
    				attr(input, "name", /*name*/ ctx[3]);
    			}

    			if (dirty[0] & /*min*/ 1) {
    				attr(input, "min", /*min*/ ctx[0]);
    			}

    			if (dirty[0] & /*max*/ 2) {
    				attr(input, "max", /*max*/ ctx[1]);
    			}

    			if (dirty[0] & /*unfocused*/ 256) {
    				toggle_class(input, "unfocused", /*unfocused*/ ctx[8]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(label);
    			if (detaching) detach(t1);
    			if (detaching) detach(div0);
    			/*div0_binding*/ ctx[23](null);
    			if (detaching) detach(t2);
    			if (detaching) detach(div1);
    			/*input_binding*/ ctx[24](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function slugify(string) {
    	let stringToSlug = string.toLowerCase();
    	stringToSlug = stringToSlug.replace(/[^a-zA-Z ]/g, "");
    	return stringToSlug.replace(/ /g, "-");
    }

    function instance($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { name = "Parameter" } = $$props;
    	let { min = 0 } = $$props;
    	let { max = 100 } = $$props;
    	let { step = 1 } = $$props;
    	let { unit = "%" } = $$props;
    	let { textposition = "" } = $$props;
    	let { mid = Math.round((max - min) / 2 / step) * step + min } = $$props;
    	let { value = mid } = $$props;
    	value = setInRangeAndRoundToStep(value);
    	let { defaultvalue = mid } = $$props;
    	defaultvalue = setInRangeAndRoundToStep(defaultvalue);
    	let decimalPlaces;

    	//variables to reference knob and numberInput elements
    	let knob;

    	function setInRangeAndRoundToStep(value) {
    		return Math.round(Math.max(Math.min(max, value), min) / step) * step;
    	}

    	function valueToNormal(value) {
    		return Math.pow((value - min) / (max - min), 1 / exponent);
    	} //end convert value to normal range

    	function normalToValue(normal) {
    		const newValue = Math.pow(normal, exponent) * (max - min) + min;
    		return Math.round(newValue / step) * step;
    	} //end convert normal range to value

    	function setNormal(newNormal) {
    		const newValue = normalToValue(newNormal);
    		if (value !== newValue) $$invalidate(2, value = parseFloat(normalToValue(newValue).toFixed(decimalPlaces)));
    	} //end set normal

    	function beginKnobTurn(e) {
    		$$invalidate(6, knob.onpointermove = handleDrag, knob);
    		knob.setPointerCapture(e.pointerId);
    	} //end begin knob turn

    	function endKnobTurn(e) {
    		knobDelta = 0;
    		$$invalidate(6, knob.onpointermove = null, knob);
    		knob.releasePointerCapture(e.pointerId);
    	} //end knob turn

    	const height = screen.height;
    	let knobDelta = 0;

    	function handleDrag(e) {
    		const dragAmount = e.movementY;

    		if (e.shiftKey) {
    			knobDelta -= dragAmount / height;
    		} else {
    			knobDelta -= dragAmount / (height / 3);
    		} //end check shift key

    		const newNormal = normalvalue + knobDelta;
    		const newValue = normalToValue(newNormal);

    		if (newValue !== value) {
    			if (newNormal >= 1) {
    				$$invalidate(2, value = max);
    			} else if (newNormal <= 0) {
    				$$invalidate(2, value = min);
    			} else {
    				$$invalidate(2, value = parseFloat(newValue.toFixed(decimalPlaces)));
    			} //end setting normalValue

    			knobDelta = 0;
    		}
    	} //end handleDrag

    	function setToDefault() {
    		$$invalidate(2, value = defaultvalue);
    	} //end set to default

    	function handleKeyDown(e) {
    		if (e.key === "Delete") {
    			setToDefault();
    		} else if (value != max && e.key === "ArrowUp" || e.key === "ArrowRight") {
    			$$invalidate(2, value += step);
    		} else if (value != min && e.key === "ArrowDown" || e.key === "ArrowLeft") {
    			$$invalidate(2, value -= step);
    		} else {
    			numericInput(e);
    		}
    	} //end handle key down

    	function dispatchInputEvent(normalvalue) {
    		dispatch("input", {
    			knob: name,
    			value,
    			normalvalue,
    			min,
    			max,
    			mid,
    			unit,
    			exponent
    		});
    	} //end dispatch input event

    	//Number Input JS
    	let numInput;

    	let unfocused = true;

    	function numericInput(e) {
    		if (isFinite(e.key) || e.key === "-") {
    			numInput.focus();
    			$$invalidate(8, unfocused = false);
    		} //end check if key press is number
    	} //end numeric input

    	function handleClick() {
    		$$invalidate(8, unfocused = false);
    		$$invalidate(7, numInput.value = value, numInput);
    		numInput.select();
    	} //end handleClick

    	function submitInput(e) {
    		if (e.keyCode === 13) {
    			//check if enter key is pressed
    			$$invalidate(2, value = setInRangeAndRoundToStep(numInput.value));

    			knob.focus();
    		}
    	} //end submitInput

    	function handleBlur() {
    		$$invalidate(7, numInput.value = null, numInput);
    		$$invalidate(8, unfocused = true);
    	} //end handle blur

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			knob = $$value;
    			$$invalidate(6, knob);
    		});
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			numInput = $$value;
    			$$invalidate(7, numInput);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("name" in $$props) $$invalidate(3, name = $$props.name);
    		if ("min" in $$props) $$invalidate(0, min = $$props.min);
    		if ("max" in $$props) $$invalidate(1, max = $$props.max);
    		if ("step" in $$props) $$invalidate(17, step = $$props.step);
    		if ("unit" in $$props) $$invalidate(4, unit = $$props.unit);
    		if ("textposition" in $$props) $$invalidate(20, textposition = $$props.textposition);
    		if ("mid" in $$props) $$invalidate(18, mid = $$props.mid);
    		if ("value" in $$props) $$invalidate(2, value = $$props.value);
    		if ("defaultvalue" in $$props) $$invalidate(19, defaultvalue = $$props.defaultvalue);
    	};

    	let exponent;
    	let normalvalue;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*min*/ 1) {
    			 if (typeof min == "string") {
    				$$invalidate(0, min = parseFloat(min));
    			}
    		}

    		if ($$self.$$.dirty[0] & /*max*/ 2) {
    			 if (typeof max == "string") {
    				$$invalidate(1, max = parseFloat(max));
    			}
    		}

    		if ($$self.$$.dirty[0] & /*step*/ 131072) {
    			 if (typeof step == "string") {
    				$$invalidate(17, step = parseFloat(step));
    			}
    		}

    		if ($$self.$$.dirty[0] & /*mid*/ 262144) {
    			 if (typeof mid == "string") {
    				$$invalidate(18, mid = parseFloat(mid));
    			}
    		}

    		if ($$self.$$.dirty[0] & /*mid, max, min*/ 262147) {
    			 if (mid > max || mid < min) {
    				$$invalidate(18, mid = setInRangeAndRoundToStep(mid));
    			}
    		}

    		if ($$self.$$.dirty[0] & /*mid, min, max*/ 262147) {
    			 exponent = Math.log10((mid - min) / (max - min)) / Math.log10(0.5);
    		}

    		if ($$self.$$.dirty[0] & /*value, max, min*/ 7) {
    			 if (value > max || value < min) {
    				$$invalidate(2, value = setInRangeAndRoundToStep(value));
    			}
    		}

    		if ($$self.$$.dirty[0] & /*value*/ 4) {
    			 $$invalidate(9, normalvalue = valueToNormal(value));
    		}

    		if ($$self.$$.dirty[0] & /*defaultvalue, max, min*/ 524291) {
    			 if (defaultvalue > max || defaultvalue < min) {
    				$$invalidate(19, defaultvalue = setInRangeAndRoundToStep(defaultvalue));
    			}
    		}

    		if ($$self.$$.dirty[0] & /*step*/ 131072) {
    			 if (Math.floor(step) === step) {
    				$$invalidate(5, decimalPlaces = 0);
    			} else {
    				$$invalidate(5, decimalPlaces = step.toString().split(".")[1].length || 0);
    			}
    		}

    		if ($$self.$$.dirty[0] & /*normalvalue*/ 512) {
    			 dispatchInputEvent(normalvalue);
    		}
    	};

    	return [
    		min,
    		max,
    		value,
    		name,
    		unit,
    		decimalPlaces,
    		knob,
    		numInput,
    		unfocused,
    		normalvalue,
    		beginKnobTurn,
    		endKnobTurn,
    		setToDefault,
    		handleKeyDown,
    		handleClick,
    		submitInput,
    		handleBlur,
    		step,
    		mid,
    		defaultvalue,
    		textposition,
    		setNormal,
    		numericInput,
    		div0_binding,
    		input_binding
    	];
    }

    class Knob extends SvelteElement {
    	constructor(options) {
    		super();

    		this.shadowRoot.innerHTML = `<style>:host{--grid-gap:0.3rem;--knob-diameter:calc(100% - var(--grid-gap) * 2);--knob-fill:#585858;--knob-fill-focus:#010101;--knob-border:none;--indicator-width:6%;--indicator-height:33%;--indicator-fill:white;--indicator-border:none;--indicator-border-radius:0;--indicator-margin-top:-1px;--label-font-size:12px;--value-font-size:8px;width:100%;height:100%;display:inline-grid;grid-gap:var(--grid-gap);grid-template-rows:min-content 1fr min-content;grid-template-areas:'label'
		'knob'
		'number'}#number-input,.wrapper,label{justify-self:center}input{text-align:center}#number-input{width:100%;grid-area:number}.wrapper{overflow:hidden;display:flex;justify-content:center;width:100%;grid-area:knob;background:transparent;touch-action:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-o-user-select:none;user-select:none}.wrapper:focus{outline:none;--knob-background:var(--knob-background-focus)}label{font-size:var(--label-font-size);grid-area:label;-webkit-user-select:none;user-select:none}g{transform-origin:50% 50%;transform:rotate(var(--knob-rotation))}svg{height:100%;display:block}circle{fill:var(--knob-fill)}rect{fill:var(--indicator-fill)}span{-webkit-user-select:none;user-select:none;margin:0}input.unfocused{position:absolute;overflow:hidden;clip:rect(0 0 0 0);height:1px;width:1px;margin:-1px;border:0}input{background:transparent;outline:0;border:0;padding:0;width:100%}input:focus{margin:0}span.unfocused{display:inline-block}span{text-align:center;font-size:var(--value-font-size);cursor:text;display:none;margin:0;width:100%}</style>`;

    		init(
    			this,
    			{ target: this.shadowRoot },
    			instance,
    			create_fragment,
    			safe_not_equal,
    			{
    				name: 3,
    				min: 0,
    				max: 1,
    				step: 17,
    				unit: 4,
    				textposition: 20,
    				mid: 18,
    				value: 2,
    				defaultvalue: 19,
    				setNormal: 21,
    				numericInput: 22
    			},
    			[-1, -1]
    		);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return [
    			"name",
    			"min",
    			"max",
    			"step",
    			"unit",
    			"textposition",
    			"mid",
    			"value",
    			"defaultvalue",
    			"setNormal",
    			"numericInput"
    		];
    	}

    	get name() {
    		return this.$$.ctx[3];
    	}

    	set name(name) {
    		this.$set({ name });
    		flush();
    	}

    	get min() {
    		return this.$$.ctx[0];
    	}

    	set min(min) {
    		this.$set({ min });
    		flush();
    	}

    	get max() {
    		return this.$$.ctx[1];
    	}

    	set max(max) {
    		this.$set({ max });
    		flush();
    	}

    	get step() {
    		return this.$$.ctx[17];
    	}

    	set step(step) {
    		this.$set({ step });
    		flush();
    	}

    	get unit() {
    		return this.$$.ctx[4];
    	}

    	set unit(unit) {
    		this.$set({ unit });
    		flush();
    	}

    	get textposition() {
    		return this.$$.ctx[20];
    	}

    	set textposition(textposition) {
    		this.$set({ textposition });
    		flush();
    	}

    	get mid() {
    		return this.$$.ctx[18];
    	}

    	set mid(mid) {
    		this.$set({ mid });
    		flush();
    	}

    	get value() {
    		return this.$$.ctx[2];
    	}

    	set value(value) {
    		this.$set({ value });
    		flush();
    	}

    	get defaultvalue() {
    		return this.$$.ctx[19];
    	}

    	set defaultvalue(defaultvalue) {
    		this.$set({ defaultvalue });
    		flush();
    	}

    	get setNormal() {
    		return this.$$.ctx[21];
    	}

    	get numericInput() {
    		return this.$$.ctx[22];
    	}
    }

    customElements.define("dt-knob", Knob);

    /* src\MIDIMapper.svelte generated by Svelte v3.26.0 */

    function create_fragment$1(ctx) {
    	let span;

    	return {
    		c() {
    			span = element("span");

    			span.innerHTML = `<button>MIDI</button> 
	<button><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"></path></svg></button>`;

    			this.c = noop;
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    class MIDIMapper extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>svg{height:100%;width:1rem}path{fill:black}</style>`;
    		init(this, { target: this.shadowRoot }, null, create_fragment$1, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("dt-midi-mapper", MIDIMapper);

    /* src\MultiSlider.svelte generated by Svelte v3.26.0 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	child_ctx[8] = i;
    	return child_ctx;
    }

    // (43:1) {#each sliderValues as slider, i}
    function create_each_block(ctx) {
    	let rect;
    	let rect_height_value;
    	let rect_x_value;

    	return {
    		c() {
    			rect = svg_element("rect");
    			attr(rect, "width", "1");
    			attr(rect, "height", rect_height_value = /*sliderValues*/ ctx[2][/*i*/ ctx[8]]);
    			attr(rect, "x", rect_x_value = /*i*/ ctx[8]);
    		},
    		m(target, anchor) {
    			insert(target, rect, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*sliderValues*/ 4 && rect_height_value !== (rect_height_value = /*sliderValues*/ ctx[2][/*i*/ ctx[8]])) {
    				attr(rect, "height", rect_height_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(rect);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let svg;
    	let svg_viewBox_value;
    	let mounted;
    	let dispose;
    	let each_value = /*sliderValues*/ ctx[2];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			svg = svg_element("svg");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			this.c = noop;
    			attr(svg, "viewBox", svg_viewBox_value = "0 0 " + /*sliders*/ ctx[0] + " 1");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "preserveAspectRatio", "none");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(svg, null);
    			}

    			/*svg_binding*/ ctx[5](svg);

    			if (!mounted) {
    				dispose = [
    					listen(svg, "pointerdown", /*beginMultiSlide*/ ctx[3]),
    					listen(svg, "pointerup", /*endMultiSlide*/ ctx[4])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*sliderValues*/ 4) {
    				each_value = /*sliderValues*/ ctx[2];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(svg, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*sliders*/ 1 && svg_viewBox_value !== (svg_viewBox_value = "0 0 " + /*sliders*/ ctx[0] + " 1")) {
    				attr(svg, "viewBox", svg_viewBox_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(svg);
    			destroy_each(each_blocks, detaching);
    			/*svg_binding*/ ctx[5](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function handleDrag(e) {
    	console.log(e);
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { sliders = 40 } = $$props;
    	let multiSlider;
    	let sliderValues = [];

    	function beginMultiSlide(e) {
    		$$invalidate(1, multiSlider.onpointermove = handleDrag, multiSlider);
    		multiSlider.setPointerCapture(e.pointerId);
    	} //end begin knob turn

    	function endMultiSlide(e) {
    		$$invalidate(1, multiSlider.onpointermove = null, multiSlider);
    		multiSlider.releasePointerCapture(e.pointerId);
    	} //end knob turn

    	function svg_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			multiSlider = $$value;
    			$$invalidate(1, multiSlider);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("sliders" in $$props) $$invalidate(0, sliders = $$props.sliders);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*sliderValues, sliders*/ 5) {
    			 if (sliderValues.length < sliders && sliders !== 0) {
    				let i;

    				for (i = sliderValues.length; i < sliders; i++) {
    					$$invalidate(2, sliderValues[i] = 0, sliderValues);
    				} //end for
    			} else if (sliderValues.length > sliders) {
    				for (i = sliderValues.length; i > sliders; i--) {
    					sliderValues.pop();
    				} //end for

    				($$invalidate(2, sliderValues), $$invalidate(0, sliders));
    			}
    		}
    	};

    	return [
    		sliders,
    		multiSlider,
    		sliderValues,
    		beginMultiSlide,
    		endMultiSlide,
    		svg_binding
    	];
    }

    class MultiSlider extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>:root{--width:100%;--height:200px;--background:white}svg{transform:scale(1, -1);background:var(--background);width:var(--width);height:var(--height)}rect{stroke:var(--background);stroke-width:0%;fill:black}</style>`;
    		init(this, { target: this.shadowRoot }, instance$1, create_fragment$2, safe_not_equal, { sliders: 0 });

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return ["sliders"];
    	}

    	get sliders() {
    		return this.$$.ctx[0];
    	}

    	set sliders(sliders) {
    		this.$set({ sliders });
    		flush();
    	}
    }

    customElements.define("dt-multi-slider", MultiSlider);

    /* src\PresetManager.svelte generated by Svelte v3.26.0 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[26] = list[i];
    	child_ctx[28] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[26] = list[i];
    	child_ctx[28] = i;
    	return child_ctx;
    }

    // (123:2) {#each presets as preset, i}
    function create_each_block_1(ctx) {
    	let option;
    	let t_value = /*preset*/ ctx[26].name + "";
    	let t;
    	let option_value_value;
    	let option_disabled_value;

    	return {
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*i*/ ctx[28];
    			option.value = option.__value;
    			option.disabled = option_disabled_value = /*i*/ ctx[28] === 0;
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*presets*/ 256 && t_value !== (t_value = /*preset*/ ctx[26].name + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    // (147:4) {#if i !== 0}
    function create_if_block(ctx) {
    	let input;
    	let input_id_value;
    	let input_value_value;
    	let input_disabled_value;
    	let t0;
    	let label;
    	let t1_value = /*preset*/ ctx[26].name + "";
    	let t1;
    	let label_for_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			t1 = text(t1_value);
    			attr(input, "type", "radio");
    			attr(input, "name", "presetOverwrite");
    			attr(input, "id", input_id_value = /*preset*/ ctx[26].name + "radio");
    			input.__value = input_value_value = /*preset*/ ctx[26].name;
    			input.value = input.__value;
    			input.disabled = input_disabled_value = !/*preset*/ ctx[26].writable;
    			/*$$binding_groups*/ ctx[16][0].push(input);
    			attr(label, "for", label_for_value = /*preset*/ ctx[26].name + "radio");
    		},
    		m(target, anchor) {
    			insert(target, input, anchor);
    			input.checked = input.__value === /*radioPresetNames*/ ctx[7];
    			insert(target, t0, anchor);
    			insert(target, label, anchor);
    			append(label, t1);

    			if (!mounted) {
    				dispose = listen(input, "change", /*input_change_handler*/ ctx[15]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*presets*/ 256 && input_id_value !== (input_id_value = /*preset*/ ctx[26].name + "radio")) {
    				attr(input, "id", input_id_value);
    			}

    			if (dirty & /*presets*/ 256 && input_value_value !== (input_value_value = /*preset*/ ctx[26].name)) {
    				input.__value = input_value_value;
    				input.value = input.__value;
    			}

    			if (dirty & /*presets*/ 256 && input_disabled_value !== (input_disabled_value = !/*preset*/ ctx[26].writable)) {
    				input.disabled = input_disabled_value;
    			}

    			if (dirty & /*radioPresetNames*/ 128) {
    				input.checked = input.__value === /*radioPresetNames*/ ctx[7];
    			}

    			if (dirty & /*presets*/ 256 && t1_value !== (t1_value = /*preset*/ ctx[26].name + "")) set_data(t1, t1_value);

    			if (dirty & /*presets*/ 256 && label_for_value !== (label_for_value = /*preset*/ ctx[26].name + "radio")) {
    				attr(label, "for", label_for_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(input);
    			/*$$binding_groups*/ ctx[16][0].splice(/*$$binding_groups*/ ctx[16][0].indexOf(input), 1);
    			if (detaching) detach(t0);
    			if (detaching) detach(label);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (146:3) {#each presets as preset, i}
    function create_each_block$1(ctx) {
    	let if_block_anchor;
    	let if_block = /*i*/ ctx[28] !== 0 && create_if_block(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*i*/ ctx[28] !== 0) if_block.p(ctx, dirty);
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let span;
    	let select;
    	let t0;
    	let button0;
    	let t2;
    	let button1;
    	let slot1;
    	let button1_disabled_value;
    	let t4;
    	let dialog0;
    	let div0;
    	let t6;
    	let form0;
    	let div1;
    	let t7;
    	let label;
    	let t8;
    	let input;
    	let t9;
    	let div2;
    	let button2;
    	let t11;
    	let button3;
    	let t13;
    	let dialog1;
    	let p0;
    	let t14;
    	let strong0;
    	let t15;
    	let t16;
    	let t17;
    	let form1;
    	let div3;
    	let button4;
    	let t19;
    	let button5;
    	let t21;
    	let dialog2;
    	let p1;
    	let t22;
    	let strong1;
    	let t23_value = /*presets*/ ctx[8][/*selectedPresetIndex*/ ctx[9]].name + "";
    	let t23;
    	let t24;
    	let t25;
    	let form2;
    	let div4;
    	let button6;
    	let t27;
    	let button7;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*presets*/ ctx[8];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*presets*/ ctx[8];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	return {
    		c() {
    			span = element("span");
    			select = element("select");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t0 = space();
    			button0 = element("button");
    			button0.innerHTML = `<slot name="save">Save</slot>`;
    			t2 = space();
    			button1 = element("button");
    			slot1 = element("slot");
    			slot1.textContent = "Delete";
    			t4 = space();
    			dialog0 = element("dialog");
    			div0 = element("div");
    			div0.textContent = "Save Preset As";
    			t6 = space();
    			form0 = element("form");
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t7 = space();
    			label = element("label");
    			t8 = text("Preset Name:\r\n\t\t\t");
    			input = element("input");
    			t9 = space();
    			div2 = element("div");
    			button2 = element("button");
    			button2.textContent = "Save";
    			t11 = space();
    			button3 = element("button");
    			button3.textContent = "Cancel";
    			t13 = space();
    			dialog1 = element("dialog");
    			p0 = element("p");
    			t14 = text("Are you sure you want to overwrite ");
    			strong0 = element("strong");
    			t15 = text(/*newPresetName*/ ctx[4]);
    			t16 = text("?");
    			t17 = space();
    			form1 = element("form");
    			div3 = element("div");
    			button4 = element("button");
    			button4.textContent = "Overwrite";
    			t19 = space();
    			button5 = element("button");
    			button5.textContent = "Cancel";
    			t21 = space();
    			dialog2 = element("dialog");
    			p1 = element("p");
    			t22 = text("Are you sure you want to delete ");
    			strong1 = element("strong");
    			t23 = text(t23_value);
    			t24 = text("?");
    			t25 = space();
    			form2 = element("form");
    			div4 = element("div");
    			button6 = element("button");
    			button6.textContent = "Delete";
    			t27 = space();
    			button7 = element("button");
    			button7.textContent = "Cancel";
    			this.c = noop;
    			if (/*selectedPresetIndex*/ ctx[9] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[13].call(select));
    			attr(slot1, "name", "delete");
    			button1.disabled = button1_disabled_value = !/*presets*/ ctx[8][/*selectedPresetIndex*/ ctx[9]].writable;
    			attr(div1, "class", "save_overwriteSelect");
    			attr(input, "type", "text");
    			attr(input, "name", "preset");
    			attr(div2, "class", "save_buttons");
    			attr(form0, "method", "dialog");
    			attr(form1, "method", "dialog");
    			attr(form2, "method", "dialog");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, select);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(select, null);
    			}

    			select_option(select, /*selectedPresetIndex*/ ctx[9]);
    			append(span, t0);
    			append(span, button0);
    			append(span, t2);
    			append(span, button1);
    			append(button1, slot1);
    			insert(target, t4, anchor);
    			insert(target, dialog0, anchor);
    			append(dialog0, div0);
    			append(dialog0, t6);
    			append(dialog0, form0);
    			append(form0, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append(form0, t7);
    			append(form0, label);
    			append(label, t8);
    			append(label, input);
    			set_input_value(input, /*newPresetName*/ ctx[4]);
    			append(form0, t9);
    			append(form0, div2);
    			append(div2, button2);
    			append(div2, t11);
    			append(div2, button3);
    			/*dialog0_binding*/ ctx[19](dialog0);
    			insert(target, t13, anchor);
    			insert(target, dialog1, anchor);
    			append(dialog1, p0);
    			append(p0, t14);
    			append(p0, strong0);
    			append(strong0, t15);
    			append(p0, t16);
    			append(dialog1, t17);
    			append(dialog1, form1);
    			append(form1, div3);
    			append(div3, button4);
    			append(div3, t19);
    			append(div3, button5);
    			/*dialog1_binding*/ ctx[21](dialog1);
    			insert(target, t21, anchor);
    			insert(target, dialog2, anchor);
    			append(dialog2, p1);
    			append(p1, t22);
    			append(p1, strong1);
    			append(strong1, t23);
    			append(p1, t24);
    			append(dialog2, t25);
    			append(dialog2, form2);
    			append(form2, div4);
    			append(div4, button6);
    			append(div4, t27);
    			append(div4, button7);
    			/*dialog2_binding*/ ctx[23](dialog2);

    			if (!mounted) {
    				dispose = [
    					listen(window, "load", /*load_handler*/ ctx[12], { once: true }),
    					listen(select, "change", /*select_change_handler*/ ctx[13]),
    					listen(button0, "click", /*openSaveDialog*/ ctx[11]),
    					listen(button1, "click", /*click_handler*/ ctx[14]),
    					listen(input, "input", /*input_input_handler*/ ctx[17]),
    					listen(button2, "click", function () {
    						if (is_function(/*savePreset*/ ctx[10](/*newPresetName*/ ctx[4], true))) /*savePreset*/ ctx[10](/*newPresetName*/ ctx[4], true).apply(this, arguments);
    					}),
    					listen(form0, "submit", /*submit_handler*/ ctx[18]),
    					listen(button4, "click", /*click_handler_1*/ ctx[20]),
    					listen(button6, "click", /*click_handler_2*/ ctx[22])
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (dirty & /*presets*/ 256) {
    				each_value_1 = /*presets*/ ctx[8];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*selectedPresetIndex*/ 512) {
    				select_option(select, /*selectedPresetIndex*/ ctx[9]);
    			}

    			if (dirty & /*presets, selectedPresetIndex*/ 768 && button1_disabled_value !== (button1_disabled_value = !/*presets*/ ctx[8][/*selectedPresetIndex*/ ctx[9]].writable)) {
    				button1.disabled = button1_disabled_value;
    			}

    			if (dirty & /*presets, radioPresetNames*/ 384) {
    				each_value = /*presets*/ ctx[8];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*newPresetName*/ 16 && input.value !== /*newPresetName*/ ctx[4]) {
    				set_input_value(input, /*newPresetName*/ ctx[4]);
    			}

    			if (dirty & /*newPresetName*/ 16) set_data(t15, /*newPresetName*/ ctx[4]);
    			if (dirty & /*presets, selectedPresetIndex*/ 768 && t23_value !== (t23_value = /*presets*/ ctx[8][/*selectedPresetIndex*/ ctx[9]].name + "")) set_data(t23, t23_value);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(span);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach(t4);
    			if (detaching) detach(dialog0);
    			destroy_each(each_blocks, detaching);
    			/*dialog0_binding*/ ctx[19](null);
    			if (detaching) detach(t13);
    			if (detaching) detach(dialog1);
    			/*dialog1_binding*/ ctx[21](null);
    			if (detaching) detach(t21);
    			if (detaching) detach(dialog2);
    			/*dialog2_binding*/ ctx[23](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let saveAsDialog, overwriteDialog, deleteDialog;

    	//variables for saving and save-as-ing presets
    	let newPresetName, presetToOverwriteIndex, newPreset, radioPresetNames;

    	let { elements = [] } = $$props;

    	/*
    {
    	selector: query selector for element,
    	attributes: [list of attributes]
    }, ...
    */
    	let presets = [
    		{
    			name: "--Select Preset--",
    			writable: false
    		}
    	];

    	/*
    {
    	name: Name of Preset,
    	writable: Boolean permission for preset overwriting,
    	presetElements : {
    		**element selector**: [
    			{
    				attribute: name of attribute,
    				value: value of attribute
    			}, ...
    		], ...
    	}
    }, ...
    */
    	let selectedPresetIndex = 0;

    	

    	function setToPreset(index, newPreset = false) {
    		const presetElements = presets[index].presetElements;

    		for (let selector in presetElements) {
    			const attributeValueArr = presetElements[selector];

    			attributeValueArr.forEach(o => {
    				document.querySelector(selector)[o.attribute] = o.value;
    			}); //end for each
    		} //end for
    	} //end setToPreset

    	function createNewPreset(name, writable) {
    		let newPreset = { name, writable, presetElements: {} };

    		elements.forEach(e => {
    			const elementDOM = document.querySelector(e.selector);
    			newPreset["presetElements"][e.selector] = [];

    			e.attributes.forEach(a => {
    				const newAttributeValue = { attribute: a, value: elementDOM[a] };
    				newPreset["presetElements"][e.selector].push(newAttributeValue);
    			}); //end (a) =>
    			//end for each element's attributes
    		}); //end (e, i) =>
    		//end for each element

    		return newPreset;
    	} //end createNewPreset

    	function savePreset(name, writable) {
    		let existingPresetIndex, existingPresetWritable;

    		let foundExisting = presets.find((o, i) => {
    			if (o.name === name) {
    				existingPresetIndex = i;
    				existingPresetWritable = o.writable;
    				return true; // stop searching
    			} //end if
    		}); //end find

    		if (!foundExisting) {
    			$$invalidate(8, presets = [...presets, createNewPreset(name, writable)]);
    			$$invalidate(9, selectedPresetIndex = presets.length - 1);
    		} else if (existingPresetWritable) {
    			$$invalidate(5, presetToOverwriteIndex = existingPresetIndex);
    			$$invalidate(6, newPreset = createNewPreset(name, writable));
    			$$invalidate(2, overwriteDialog.open = true, overwriteDialog);
    		}
    	} //end set preset

    	function openSaveDialog() {
    		$$invalidate(7, radioPresetNames = null);
    		$$invalidate(4, newPresetName = null);
    		$$invalidate(1, saveAsDialog.open = true, saveAsDialog);
    	} //end openSaveDialog

    	const $$binding_groups = [[]];

    	const load_handler = () => {
    		if (!presets["default"] && elements.length > 0) savePreset("default", false);
    	};

    	function select_change_handler() {
    		selectedPresetIndex = select_value(this);
    		$$invalidate(9, selectedPresetIndex);
    	}

    	const click_handler = () => $$invalidate(3, deleteDialog.open = true, deleteDialog);

    	function input_change_handler() {
    		radioPresetNames = this.__value;
    		$$invalidate(7, radioPresetNames);
    	}

    	function input_input_handler() {
    		newPresetName = this.value;
    		($$invalidate(4, newPresetName), $$invalidate(7, radioPresetNames));
    	}

    	const submit_handler = e => console.log(e.target.returnValue);

    	function dialog0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			saveAsDialog = $$value;
    			$$invalidate(1, saveAsDialog);
    		});
    	}

    	const click_handler_1 = () => $$invalidate(8, presets[presetToOverwriteIndex] = newPreset, presets);

    	function dialog1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			overwriteDialog = $$value;
    			$$invalidate(2, overwriteDialog);
    		});
    	}

    	const click_handler_2 = () => {
    		presets.splice(selectedPresetIndex, 1);
    		$$invalidate(8, presets);
    		$$invalidate(9, selectedPresetIndex = 0);
    	};

    	function dialog2_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			deleteDialog = $$value;
    			$$invalidate(3, deleteDialog);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("elements" in $$props) $$invalidate(0, elements = $$props.elements);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*radioPresetNames*/ 128) {
    			 {
    				$$invalidate(4, newPresetName = radioPresetNames);
    			}
    		}

    		if ($$self.$$.dirty & /*selectedPresetIndex*/ 512) {
    			 if (selectedPresetIndex !== 0) {
    				setToPreset(selectedPresetIndex);
    			}
    		}
    	};

    	return [
    		elements,
    		saveAsDialog,
    		overwriteDialog,
    		deleteDialog,
    		newPresetName,
    		presetToOverwriteIndex,
    		newPreset,
    		radioPresetNames,
    		presets,
    		selectedPresetIndex,
    		savePreset,
    		openSaveDialog,
    		load_handler,
    		select_change_handler,
    		click_handler,
    		input_change_handler,
    		$$binding_groups,
    		input_input_handler,
    		submit_handler,
    		dialog0_binding,
    		click_handler_1,
    		dialog1_binding,
    		click_handler_2,
    		dialog2_binding
    	];
    }

    class PresetManager extends SvelteElement {
    	constructor(options) {
    		super();

    		this.shadowRoot.innerHTML = `<style>dialog{z-index:9999;position:fixed;top:50%;transform-origin:50% 50%;transform:translateY(-50%)
	}.save_buttons{width:100%}.save_overwriteSelect{max-height:50vh;overflow-y:auto;background:#F8F8F8;border:1px solid #ccc;margin:0.5rem 0}.save_overwriteSelect label{padding:0.5rem}.save_overwriteSelect label:hover{background:WhiteSmoke}input[type="radio"]:checked+label{background:LightGray}input[type="radio"]{position:absolute;opacity:0;height:0;width:0}</style>`;

    		init(this, { target: this.shadowRoot }, instance$2, create_fragment$3, safe_not_equal, { elements: 0 });

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return ["elements"];
    	}

    	get elements() {
    		return this.$$.ctx[0];
    	}

    	set elements(elements) {
    		this.$set({ elements });
    		flush();
    	}
    }

    customElements.define("dt-preset-manager", PresetManager);

    /* src\PolyBonk.svelte generated by Svelte v3.26.0 */

    function create_fragment$4(ctx) {
    	let slot0;
    	let input;
    	let t0;
    	let label;
    	let slot1;
    	let t2;
    	let div0;
    	let t3;
    	let div1;
    	let t4;
    	let div2;
    	let t5;
    	let div3;
    	let t6;
    	let div4;

    	return {
    		c() {
    			slot0 = element("slot");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			slot1 = element("slot");
    			slot1.textContent = "Click Me!";
    			t2 = space();
    			div0 = element("div");
    			t3 = space();
    			div1 = element("div");
    			t4 = space();
    			div2 = element("div");
    			t5 = space();
    			div3 = element("div");
    			t6 = space();
    			div4 = element("div");
    			this.c = noop;
    			attr(input, "type", "button");
    			attr(input, "id", /*inputid*/ ctx[0]);
    			attr(slot0, "name", "input");
    			attr(slot1, "name", "label-content");
    			attr(div0, "class", "face front");
    			attr(div1, "class", "face bottom");
    			attr(div2, "class", "face left");
    			attr(div3, "class", "face right");
    			attr(div4, "class", "face top");
    			attr(label, "for", /*inputid*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, slot0, anchor);
    			append(slot0, input);
    			insert(target, t0, anchor);
    			insert(target, label, anchor);
    			append(label, slot1);
    			append(label, t2);
    			append(label, div0);
    			append(label, t3);
    			append(label, div1);
    			append(label, t4);
    			append(label, div2);
    			append(label, t5);
    			append(label, div3);
    			append(label, t6);
    			append(label, div4);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*inputid*/ 1) {
    				attr(input, "id", /*inputid*/ ctx[0]);
    			}

    			if (dirty & /*inputid*/ 1) {
    				attr(label, "for", /*inputid*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(slot0);
    			if (detaching) detach(t0);
    			if (detaching) detach(label);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { inputid = "input" } = $$props;

    	$$self.$$set = $$props => {
    		if ("inputid" in $$props) $$invalidate(0, inputid = $$props.inputid);
    	};

    	return [inputid];
    }

    class PolyBonk extends SvelteElement {
    	constructor(options) {
    		super();

    		this.shadowRoot.innerHTML = `<style>:host{--width:auto;--height:auto;--padding:0.4em;--margin:0.4em;--border:none;--display:inline-block;--align:center;--border-width:1px;--border-color:transparent;--border-color-focus:black;--depth:2em;--depth-active:0.5em;--depth-checked:1em;--depth-hover-mod:0.5em;--transition-duration:40ms;--transition-timing-function:linear;--filter-active:brightness(90%);--filter-checked:brightness(93%);--filter-hover:none;--background-face:#f4f4f4;--background-sides:#ddd;--background-poles:grey}label,.face{transition-timing-function:var(--transition-timing-function)}label{--depth-delta:var(--depth);--border-color-delta:var(--border-color);--filter:none;border-radius:0;transform-style:preserve-3d;transition:transform var(--transition-duration),
								background var(--transition-duration);transform:translateZ(var(--depth-delta));border:0;background:transparent;width:var(--width);height:var(--height);padding:var(--padding);margin:var(--margin);text-align:var(--align);display:var(--display)}.face{width:100%;height:100%;position:absolute;top:0;left:0;transform-origin:0% 0%;backface-visibility:hidden;z-index:-1;filter:none;transition:filter var(--transition-duration)}.front{background:var(--background-face);outline-width:var(--border-width);outline-style:solid;outline-color:var(--border-color-delta);outline-offset:calc(var(--border-width) * -1)}.left,.right{transition:width var(--transition-duration);width:var(--depth-delta);background:var(--background-sides)}.top,.bottom{transition:height var(--transition-duration);height:var(--depth-delta);background:var(--background-poles)}.left{transform:rotateZ(180deg) translateY(-100%) rotateY(90deg)}.right{left:100%;transform:rotateY(90deg)}.top{transform:rotateZ(180deg) translateX(-100%) rotateX(-90deg)}.bottom{top:100%;transform:rotateX(-90deg) }:sloted(input){position:absolute;opacity:0;height:0;width:0}label:hover{--depth-delta:calc(var(--depth) + var(--depth-hover-mod))}label:hover>.face{filter:var(--filter-hover)}input:checked+label{--depth-delta:var(--depth-checked)}::sloted(input:checked)+label>.face,::sloted(input:checked)+label>.face{filter:var(--filter-checked)}::sloted(input:checked)+label:hover{--depth-delta:calc(var(--depth-checked) + var(--depth-hover-mod))}::sloted(input:focus)+label>.front,label:active>.front{--border-color-delta:var(--border-color-focus)}label:active,::sloted(input:checked)+label:active{--depth-delta:var(--depth-active)}label:active>.face,::sloted(input:checked)+label:active>.face{filter:var(--filter-active)}</style>`;

    		init(this, { target: this.shadowRoot }, instance$3, create_fragment$4, safe_not_equal, { inputid: 0 });

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return ["inputid"];
    	}

    	get inputid() {
    		return this.$$.ctx[0];
    	}

    	set inputid(inputid) {
    		this.$set({ inputid });
    		flush();
    	}
    }

    customElements.define("poly-bonk", PolyBonk);

    /* src\PolyChunk.svelte generated by Svelte v3.26.0 */

    function create_fragment$5(ctx) {
    	let div4;

    	return {
    		c() {
    			div4 = element("div");

    			div4.innerHTML = `<slot></slot> 
	<div class="face bottom"></div> 
	<div class="face left"></div> 
	<div class="face right"></div> 
	<div class="face top"></div>`;

    			this.c = noop;
    			attr(div4, "class", "container");
    		},
    		m(target, anchor) {
    			insert(target, div4, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div4);
    		}
    	};
    }

    class PolyChunk extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>:host{--chunk-background:lightgrey;--chunk-depth:7em;--chunk-height:auto}.container{transform-style:preserve-3d;background:var(--chunk-background);height:var(--chunk-height)}.face{width:100%;height:100%;position:absolute;top:0;left:0;transform-origin:0% 0%;backface-visibility:hidden;background:var(--chunk-background)}.top,.right{filter:brightness(80%)}.bottom,.left{filter:brightness(50%)}.left,.right{width:var(--chunk-depth)}.top,.bottom{height:var(--chunk-depth)}.left{transform:rotateZ(180deg) translateY(-100%) rotateY(90deg)}.right{left:100%;transform:rotateY(90deg)}.top{transform:rotateZ(180deg) translateX(-100%) rotateX(-90deg)}.bottom{top:100%;transform:rotateX(-90deg) }</style>`;
    		init(this, { target: this.shadowRoot }, null, create_fragment$5, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("poly-chunk", PolyChunk);

    /* src\PolyPrism.svelte generated by Svelte v3.26.0 */

    function create_fragment$6(ctx) {
    	let div1;
    	let svg;
    	let path_1;
    	let t;
    	let div0;

    	return {
    		c() {
    			div1 = element("div");
    			svg = svg_element("svg");
    			path_1 = svg_element("path");
    			t = space();
    			div0 = element("div");
    			this.c = noop;
    			attr(path_1, "d", /*path*/ ctx[0]);
    			attr(svg, "viewBox", "0 0 100 100");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(div0, "class", "polygons");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, svg);
    			append(svg, path_1);
    			append(div1, t);
    			append(div1, div0);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*path*/ 1) {
    				attr(path_1, "d", /*path*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div1);
    		}
    	};
    }

    function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    	const angleInRadians = (angleInDegrees - 90) * Math.PI / 180;

    	return {
    		x: centerX + radius * Math.cos(angleInRadians),
    		y: centerY + radius * Math.sin(angleInRadians)
    	};
    } //end polarToCartesian

    function polygon(centerX, centerY, points, radius) {
    	const degreeIncrement = 360 / points;

    	const d = new Array(points).fill("foo").map((p, i) => {
    		const point = polarToCartesian(centerX, centerY, radius, degreeIncrement * i);
    		return `${point.x},${point.y}`;
    	});

    	return `M${d}Z`;
    } //end polygon

    function instance$4($$self, $$props, $$invalidate) {
    	let { sides = 3 } = $$props;

    	$$self.$$set = $$props => {
    		if ("sides" in $$props) $$invalidate(1, sides = $$props.sides);
    	};

    	let externalAngle;
    	let divisorS;
    	let polygonSide;
    	let path;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*sides*/ 2) {
    			 if (typeof sides == "string") {
    				$$invalidate(1, sides = parseInt(sides));
    			}
    		}

    		if ($$self.$$.dirty & /*sides*/ 2) {
    			 $$invalidate(2, externalAngle = 180 - (sides - 2) * (180 / sides));
    		}

    		if ($$self.$$.dirty & /*sides*/ 2) {
    			 $$invalidate(3, divisorS = 2 * Math.sin(Math.PI / sides));
    		}

    		if ($$self.$$.dirty & /*sides*/ 2) ;

    		if ($$self.$$.dirty & /*divisorS*/ 8) {
    			 $$invalidate(5, polygonSide = 50 * divisorS);
    		}

    		if ($$self.$$.dirty & /*externalAngle, polygonSide*/ 36) ;

    		if ($$self.$$.dirty & /*externalAngle, polygonSide*/ 36) ;

    		if ($$self.$$.dirty & /*sides*/ 2) {
    			 $$invalidate(0, path = polygon(50, 50, sides, 50));
    		}
    	};

    	return [path, sides];
    }

    class PolyPrism extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>svg{width:100%}div{width:fit-content;height:fit-content}.polygons{width:100%;height:100%;position:absolute;top:0%;left:0%}</style>`;
    		init(this, { target: this.shadowRoot }, instance$4, create_fragment$6, safe_not_equal, { sides: 1 });

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return ["sides"];
    	}

    	get sides() {
    		return this.$$.ctx[1];
    	}

    	set sides(sides) {
    		this.$set({ sides });
    		flush();
    	}
    }

    customElements.define("poly-prism", PolyPrism);

    exports.Knob = Knob;
    exports.MIDIMapper = MIDIMapper;
    exports.MultiSlider = MultiSlider;
    exports.PolyBonk = PolyBonk;
    exports.PolyChunk = PolyChunk;
    exports.PolyPrism = PolyPrism;
    exports.PresetManager = PresetManager;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
