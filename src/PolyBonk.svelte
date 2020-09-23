<svelte:options tag="poly-bonk" />

<script>
	export let inputid = "input";
</script>

	<slot name="input">
		<input type="button"
				 id={inputid}>
	</slot>

	<label for={inputid}>

		<slot name="label-content">Click Me!</slot>

		<!--Faces of Rectangular Prism-->
		<div class="face front"></div>
		<div class="face bottom"></div>
		<div class="face left"></div>
		<div class="face right"></div>
		<div class="face top"></div>

	</label>

<style>
	:host {
		--width: auto;
		--height: auto;
		--padding: 0.4em;
		--margin: 0.4em;
		--border: none;
		--display: inline-block;
		--align: center;

		--border-width: 1px;
		--border-color: transparent;
		--border-color-focus: black;

		--depth: 2em;
		--depth-active: 0.5em;
		--depth-checked: 1em;
		--depth-hover-mod: 0.5em;

		--transition-duration: 40ms;
		--transition-timing-function: linear;
		--filter-active: brightness(90%);
		--filter-checked: brightness(93%);
		--filter-hover: none;

		--background-face: #f4f4f4;
		--background-sides: #ddd;
		--background-poles: grey;
	}

	label, .face {
		transition-timing-function: var(--transition-timing-function);
	}

	label {
		--depth-delta: var(--depth);
		--border-color-delta: var(--border-color);
		--filter: none;

		border-radius: 0;
  	transform-style: preserve-3d;
		transition: transform var(--transition-duration),
								background var(--transition-duration);
		transform: translateZ(var(--depth-delta));

		border: 0;
		background: transparent;

		width: var(--width);
		height: var(--height);
		padding: var(--padding);
		margin: var(--margin);
		text-align: var(--align);
		display: var(--display);
	}

	.face {
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
		transform-origin: 0% 0%;
		backface-visibility: hidden;
		z-index: -1;


		filter: none;
		transition: filter var(--transition-duration);
	}

	.front {
		background: var(--background-face);

		outline-width: var(--border-width);
		outline-style: solid;
		outline-color: var(--border-color-delta);
		outline-offset: calc(var(--border-width) * -1);
	}

	.left, .right {
		transition: width var(--transition-duration);
		width: var(--depth-delta);
		background: var(--background-sides);
	}

	.top, .bottom {
		transition: height var(--transition-duration);
		height: var(--depth-delta);
		background: var(--background-poles);
	}

	.left {
		transform: rotateZ(180deg) translateY(-100%) rotateY(90deg);
	}

	.right {
		left: 100%;
		transform: rotateY(90deg);
	}

	.top {
		transform: rotateZ(180deg) translateX(-100%) rotateX(-90deg);
	}

	.bottom {
		top: 100%;
		transform: rotateX(-90deg) ;
	}

	/* Hide the slotted input element */
	:sloted(input) {
		position: absolute;
		opacity: 0;
		height: 0;
		width: 0;
	}

	label:hover {
		--depth-delta: calc(var(--depth) + var(--depth-hover-mod));
	}

	label:hover > .face {
		filter: var(--filter-hover);
	}

	/*Checkbox & Radio CSS*/
	input:checked + label {
		--depth-delta: var(--depth-checked);
	}

	::sloted(input:checked) + label > .face, ::sloted(input:checked) + label > .face {
		filter: var(--filter-checked);
	}

	::sloted(input:checked) + label:hover {
		--depth-delta: calc(var(--depth-checked) + var(--depth-hover-mod));
	}

	::sloted(input:focus) + label > .front, label:active > .front {
		--border-color-delta: var(--border-color-focus);
	}

	label:active, ::sloted(input:checked) + label:active {
		--depth-delta: var(--depth-active);
	}

	label:active > .face, ::sloted(input:checked) + label:active > .face {
		filter: var(--filter-active);
	}
</style>
