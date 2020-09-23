<svelte:options tag="poly-chunk" />

<div class="container">
	<slot></slot>
	<div class="face bottom"></div>
	<div class="face left"></div>
	<div class="face right"></div>
	<div class="face top"></div>
</div>

<style>
	:host {
		--chunk-background: lightgrey;
		--chunk-depth: 7em;
		--chunk-height: auto;
	}

	.container {
  		transform-style: preserve-3d;
		background: var(--chunk-background);
		height: var(--chunk-height);
	}

	.face {
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
		transform-origin: 0% 0%;
		backface-visibility: hidden;
		background: var(--chunk-background);
	}

	.top, .right {
		filter: brightness(80%);
	}

	.bottom, .left {
		filter: brightness(50%);
	}

	.left, .right {
		width: var(--chunk-depth);
	}

	.top, .bottom {
		height: var(--chunk-depth);
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
</style>
