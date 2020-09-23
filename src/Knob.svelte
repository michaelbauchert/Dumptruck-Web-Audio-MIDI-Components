<svelte:options tag="dt-knob" />

<script>
	import { createEventDispatcher, beforeUpdate } from 'svelte';
	const dispatch = createEventDispatcher();

	export let name = 'Parameter';

	export let min = 0;
	$: if((typeof min) == "string") {
		min = parseFloat(min);
	}

	export let max = 100;
	$: if((typeof max) == "string") {
		max = parseFloat(max);
	}

	export let step = 1;
	$: if((typeof step) == "string") {
		step = parseFloat(step);
	}

	export let unit = "%";
	export let textposition = "";

	export let mid = Math.round((max - min) / 2 / step) * step + min;
	$: if(mid > max || mid < min) {
		mid = setInRangeAndRoundToStep(mid);
	}
	$:exponent = Math.log10((mid - min) / (max - min))/Math.log10(0.5);

	export let value = mid;
	$:normalvalue = valueToNormal(value);
	value = setInRangeAndRoundToStep(value);
	$: if(value > max || value < min) {
		value = setInRangeAndRoundToStep(value);
	}

	export let defaultvalue = mid;
	defaultvalue = setInRangeAndRoundToStep(defaultvalue);
	$: if(defaultvalue > max || defaultvalue < min) {
		defaultvalue = setInRangeAndRoundToStep(defaultvalue);
	}

	let decimalPlaces;
	$: if(Math.floor(step) === step) {
		decimalPlaces = 0;
	} else {
		decimalPlaces = step.toString().split(".")[1].length || 0;
	}

	//variables to reference knob and numberInput elements
	let knob;
	let numberInput;

	function setInRangeAndRoundToStep(value) {
		return Math.round(Math.max(Math.min(max, value), min) / step) * step;
	}

	function valueToNormal(value) {
		return Math.pow((value - min) / (max - min), 1/exponent);
	}//end convert value to normal range

	function normalToValue(normal) {
		const newValue = Math.pow(normal, exponent) * (max - min) + min;
		return Math.round(newValue / step) * step;
	}//end convert normal range to value

	export function setNormal(newNormal) {
		const newValue = normalToValue(newNormal);
		if (value !== newValue)
			value = parseFloat(normalToValue(newValue).toFixed(decimalPlaces));
	}//end set normal

	function beginKnobTurn(e) {
		knob.onpointermove = handleDrag;
		knob.setPointerCapture(e.pointerId);
	}//end begin knob turn

	function endKnobTurn(e) {
		knobDelta = 0;
		knob.onpointermove = null;
  	knob.releasePointerCapture(e.pointerId);
	}//end knob turn

	const height = screen.height;
	function handleDrag(e) {
			const dragAmount = e.movementY;
			if(e.shiftKey) {
				knobDelta -= dragAmount/height;
			} else {
				knobDelta -= dragAmount/(height / 3);
			}//end check shift key
	}//end handleDrag

	let knobDelta = 0;
	$:if (normalToValue(valueToNormal(value) + knobDelta) !== value) {
		let newNormal = valueToNormal(value) + knobDelta;
		if(newNormal >= 1) {
			value = max;
		} else if (newNormal <= 0) {
			value = min;
		} else {
			value = parseFloat(normalToValue(newNormal).toFixed(decimalPlaces));
		}//end setting normalValue
		knobDelta = 0;
	}

	function setToDefault() {
		value = defaultvalue;
	}//end set to default

	function handleKeyDown(e) {
		if (e.key === "Delete") {
			setToDefault();
		} else if (value != max && e.key === "ArrowUp" || e.key === "ArrowRight") {
			value += step;
		} else if (value != min && e.key === "ArrowDown" || e.key === "ArrowLeft") {
			value -= step;
		} else {
			numericInput(e);
		}
	}//end handle key down

	$:dispatchInputEvent(normalvalue);
	function dispatchInputEvent(normalvalue) {
		dispatch('input', {
				knob: name,
				value: value,
				normalvalue: normalvalue,
				min: min,
				max: max,
				mid: mid,
				unit: unit,
				exponent: exponent,
			});
	}//end dispatch input event

	//Number Input JS
	let numInput;
	let unfocused = true;

	export function numericInput(e) {
		if (isFinite(e.key) || e.key === '-') {
			numInput.focus();
			unfocused = false;
		}//end check if key press is number
	}//end numeric input

	function handleClick() {
		unfocused = false;
		numInput.value = value;
		numInput.select();
	}//end handleClick

	function submitInput (e) {
		if (e.keyCode === 13) { //check if enter key is pressed
			value = setInRangeAndRoundToStep(numInput.value);
			knob.focus();
		}
	}//end submitInput

	function handleBlur() {
		numInput.value = null;
		unfocused = true;
	}//end handle blur

	function slugify(string) {
		let stringToSlug = string.toLowerCase();
		stringToSlug = stringToSlug.replace(/[^a-zA-Z ]/g, "");
		return stringToSlug.replace(/ /g,"-");
	}
</script>

<div class="container {textposition}">
	<label for={slugify(name)}>{name}</label>
	<div class="wrapper"
			 style="--knob-rotation:{normalvalue * 300 - 150}deg;
							--normal:{normalvalue};
							--normal-rotation:{Math.abs(normalvalue * 2 - 1)};"
			 id={slugify(name)}
			 name={slugify(name)}
			 bind:this={knob}
			 tabindex="0"
			 draggable="false"
			 role="slider"
			 aria-valuemin={min}
			 aria-valuemax={max}
			 aria-valuenow={value}

			 on:pointerdown={beginKnobTurn}
			 on:pointerup={endKnobTurn}
			 on:dblclick={setToDefault}
			 on:keydown={handleKeyDown}>
			<slot>
				<div class="knob">
					<div class="indicator"></div>
				</div>
			</slot>
	</div>

	<div id="number-input">
		<span on:click={handleClick}
				role="presentation"
				class:unfocused>{value.toFixed(decimalPlaces) + " " + unit}</span>

		<input type="number"
					 bind:this={numInput}
					 name={name}
					 min={min}
					 max={max}
					 tabindex="-1"
					 on:keyup={submitInput}
					 class:unfocused
					 on:blur={handleBlur}>
	</div>
</div>

<style>
	:host {
		width: 100%;
		height: auto;

		--grid-gap: 0.3rem;

		--knob-diameter: 80px;
		--knob-background: #585858;
		--knob-background-focus: #010101;
		--knob-border: none;

		--indicator-width: 6%;
		--indicator-height: 33%;
		--indicator-background: white;
		--indicator-border: none;
		--indicator-border-radius: 0;
		--indicator-margin-top: -1px;
	}

	.container {
		transform-style: preserve-3d;
		width: 100%;
		display: inline-grid;
		grid-gap: var(--grid-gap);
		grid-template-areas: 'label'
												 'knob'
												 'number';
	}

	#number-input,
	.wrapper,
	label {
		justify-self:center;
	}

	.right {
		grid-template-areas: 'knob label'
												 'knob number';
	}

	input {
		text-align: center;
	}

	.right #number-input,
	.right label,
	.left #number-input,
	.left label{
		justify-self: start;
	}

	.right #number-input,
	.left #number-input{
		align-self: start;
	}

	.right input,
	.left input{
		text-align: left;
	}

	.right label,
	.left label{
		align-self: end;
	}

	.left {
		grid-template-areas: 
		'label knob'
		'number knob';
	}

	.top {
		justify-content: center;
		grid-template-areas: 
		'label'
		'number'
		'knob';
	}

	.bottom {
		grid-template-areas: 
		'knob'
		'label'
		'number';
	}

	#number-input {
		width: max-content;
		grid-area: number;
	}

	.wrapper {
		grid-area: knob;
		background: transparent;
		touch-action: none;
		-webkit-user-select: none;
		-khtml-user-select: none;
		-moz-user-select: none;
		-o-user-select: none;
		user-select: none;
	}

	.wrapper:focus {
		outline: none;
		--knob-background: var(--knob-background-focus);
	}

	label {
		grid-area: label;
		-webkit-user-select: none;  /* Safari all */
  		user-select: none;
	}

	.container:focus-within label {
		text-decoration: underline;
	}

	/*Default Knob Styles */
	.knob {
		width: var(--knob-diameter);
		height: var(--knob-diameter);
		border-radius: 100%;
		display: flex;
		justify-content: center;

		transform: rotate(var(--knob-rotation));
		background: var(--knob-background);
		border: var(--knob-border);
	}

	.indicator {
		background: var(--indicator-background);
		width: var(--indicator-width);
		height: var(--indicator-height);
		margin-top: var(--indicator-margin-top);
		border: var(--indicator-border);
		border-radius: var(--indicator-border-radius);
		box-shadow: var(--indicator-box-shadow);
	}

	/*Number Input Styles*/
	span {
		-webkit-user-select: none;  /* Safari all */
		user-select: none;
		margin: 0;
	}

	input.unfocused {
		position: absolute;
		overflow: hidden;
		clip: rect(0 0 0 0);
		height: 1px;
		width: 1px;
		margin: -1px;
		border: 0;
	}

	input {
		outline: 0;
		border: 0;
		padding: 0;
		width: 100%;
	}

	input:focus {
		margin: 0;
	}

	span.unfocused {
		display: inline-block;
	}

	span {
		cursor: text;
		display: none;
		margin: 0;
	}
</style>
