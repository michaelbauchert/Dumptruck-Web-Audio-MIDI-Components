<svelte:options tag="dt-multi-slider" />

<script>
	export let sliders = 40;

	let multiSlider;
	let sliderValues = [];

	$: if(sliderValues.length < sliders && sliders !== 0) {
		let i;
		for(i = sliderValues.length; i < sliders; i++) {
			sliderValues[i] = 0;
		}//end for
	} else if ( sliderValues.length > sliders ) {
		for(i = sliderValues.length; i > sliders; i--) {
			sliderValues.pop();
		}//end for
		sliderValues = sliderValues;
	}

	function beginMultiSlide(e) {
		multiSlider.onpointermove = handleDrag;
		multiSlider.setPointerCapture(e.pointerId);
	}//end begin knob turn

	function endMultiSlide(e) {
		multiSlider.onpointermove = null;
  	multiSlider.releasePointerCapture(e.pointerId);
	}//end knob turn

	function handleDrag(e) {
		console.log(e);
	}
</script>

<svg bind:this={multiSlider}
		 on:pointerdown={beginMultiSlide}
		 on:pointerup={endMultiSlide}
		 viewBox="0 0 {sliders} 1"
		 xmlns="http://www.w3.org/2000/svg"
		 preserveAspectRatio="none">

	{#each sliderValues as slider, i}
		<rect width="1"
					height={sliderValues[i]}
					x={i}/>
	{/each}
</svg>

<style>
	:root  {
		--width: 100%;
		--height: 200px;

		--background: white;

	}

	svg {
		transform: scale(1, -1);
		background: var(--background);
		width: var(--width);
		height: var(--height);
	}

	rect {
		stroke: var(--background);
		stroke-width: 0%;
		fill: black;
	}
</style>
