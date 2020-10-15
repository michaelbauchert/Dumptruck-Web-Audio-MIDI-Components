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

<div>
	<svg viewBox="0 0 100 100"
		xmlns="http://www.w3.org/2000/svg">
		<path d={path}></path>
	</svg>

	<div class="polygons"></div>
</div>


<style>
	svg {
		width: 100%;
	}

	div {
		width: fit-content;
		height: fit-content;
	}

	.polygons {
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0%;
		left: 0%;
	}
</style>

