<svelte:options tag="poly-prism" />

<script>
	export let sides = 3;
	$: if((typeof sides) == "string") {
		sides = parseInt(sides);
	}

	$: externalAngle = 180 - (sides - 2) * (180 / sides);
	$: divisorS = 2 * Math.sin(Math.PI / sides);
	$: divisorA = Math.cos(Math.PI / sides);

	$: polygonSide = 50 * divisorS;
	$: vectorO = Math.sin(externalAngle) * polygonSide;
	$: vectorA = Math.cos(externalAngle) * polygonSide;

	$: path = polygon(50, 50, sides, 50);

	/* polarToCartesian() and polygon() taken from
		 Ted Goodridge's (aka zeroskillz) React stackblitz project, svg-polygon-generator
		 https://stackblitz.com/edit/svg-polygon-generator?file=index.js */

	function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
		const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
		return {
			x: centerX + (radius * Math.cos(angleInRadians)),
			y: centerY + (radius * Math.sin(angleInRadians))
		};
	}//end polarToCartesian


	function polygon(centerX, centerY, points, radius) {
		const degreeIncrement = 360 / (points);
		const d = new Array(points).fill('foo').map((p, i) => {
			const point = polarToCartesian(centerX, centerY, radius, degreeIncrement * i);
			return `${point.x},${point.y}`;
		});
		return `M${d}Z`;
	}//end polygon
</script>

<div class="poly-prism"
		 style="--divisor-s: {divisorS};
						--divisor-a: {divisorA};
						--adjustAngle: {externalAngle / 2}deg;">
	<!--Polygon Knob Face-->
	<svg viewBox="0 0 100 100"
			 xmlns="http://www.w3.org/2000/svg"
			 id="prism">
		<path d={path}></path>
	</svg>

	<!--Prism Sides-->
	{#each {length: sides} as _, i}
		<div class="side"
				 style="--angle-no-units: {externalAngle * i};
								--angle: calc(var(--angle-no-units) * 1deg)"></div>
	{/each}

	<!--Indicator-->
	<div class="indicator">
		<div class="face front"></div>
		<div class="face bottom"></div>
		<div class="face left"></div>
		<div class="face right"></div>
		<div class="face top"></div>
	</div>
</div>

<style>
	:host {
		--prism-diameter: 10vw;
		--prism-depth: calc(var(--prism-diameter) * 1.3);
		--prism-background: #444;

		--indicator-background: cyan;
		--indicator-width: 10%;
		--indicator-height: 40%;
		--indicator-depth: calc(var(--prism-depth) * 0.1);

	}

	.poly-prism {

		width: var(--prism-diameter);
		padding-top: var(--prism-diameter);
		height: 0;
		position: relative;

		transform-style: preserve-3d !important;
		transform: rotateZ(calc(var(--adjustAngle) + var(--knob-rotation)))
							 translateZ(calc(var(--prism-depth) / 2));
	}

	svg {
		transform-style: preserve-3d !important;
		fill: var(--prism-background);
		width: 100%;
		height: auto;
		position: absolute;
		top: 0;
		left: 0;
		transform: rotateZ(calc(var(--adjustAngle) * -1))
							 translateZ(calc(var(--prism-depth) / 2));
	}

	.side {
		--background: var(--prism-background);
		--hue: calc(var(--angle-no-units) + (var(--normal) * 300 - 150));
		--width: calc(var(--prism-diameter) / 2 * var(--divisor-s));

		height: var(--prism-depth);
		width: var(--width);
		position: absolute;
		transform-origin: 50% 50%;
		top: calc(50% - var(--prism-depth) / 2);
		right: calc(50% - var(--width) / 2);
		transform: rotateX(90deg)
							 rotateY(var(--angle))
							 translateZ(calc(var(--prism-diameter) / 2 * var(--divisor-a) - 0.5px));

	}

	svg, .side {
		backface-visibility: hidden;
	}

	/*Indicator Styles*/
	.indicator {
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		position: absolute;
		pointer-events: none;
  	transform-style: preserve-3d;
		transform: rotateZ(calc(var(--adjustAngle) * -1))
						   translateZ(calc(var(--prism-depth) / 2 + var(--indicator-depth)))
			         translateX(calc(50% - var(--indicator-width) / 2))
							 translateY(-1px);
		--background: var(--indicator-background);
	}

	.face {
		width: var(--indicator-width);
		height: var(--indicator-height);
		position: absolute;
		transform-origin: 0% 0%;
		backface-visibility: hidden;
	}

	.front {
		background: var(--indicator-background) !important;
	}

	.left, .right {
		width: calc(var(--prism-depth) + var(--indicator-depth));
	}

	.top, .bottom {
		height: calc(var(--prism-depth) + var(--indicator-depth));
	}

	.left {
		--hue: calc(225 + (var(--normal) * 300 - 150));
		transform: rotateZ(180deg) translateY(-100%) rotateY(90deg);
	}

	.right {
		--hue: calc(45 + (var(--normal) * 300 - 150));
		left: var(--indicator-width);
		transform: rotateY(90deg);
	}

	.top {
		--hue: calc(315 + (var(--normal) * 300 - 150));
		transform: rotateZ(180deg) translateX(-100%) rotateX(-90deg);
	}

	.bottom {
		--hue: calc(135 + (var(--normal) * 300 - 150));
		top: var(--indicator-height);
		transform: rotateX(-90deg) ;
	}

	/*Sides Lighting*/
	.face, .side {
		background: linear-gradient(#BBB, #BBB),
							  linear-gradient(var(--background), var(--background)),
								linear-gradient(black, black),
								linear-gradient(rgb(255, 0, 0), rgb(255, 0, 0)),
								hsl(var(--hue), 100%, 75%);

		background-blend-mode: overlay, overlay, color, multiply;
	}

</style>
