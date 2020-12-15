<svelte:options tag="dt-scope"/>

<script>
    import { onMount } from 'svelte';
    import { Oscillator, AudioToGain, Scale, Waveform } from 'tone';

    export let width = 600;
    export let height = 240;
    export let ppf = 5;
    export let buffersize = 128;
    export let linewidth = 2;

    const osc = new Oscillator(3, "sine").start();

    export const input = new AudioToGain();
    const scale = new Scale(linewidth/2, height - linewidth/2);
    const waveform = new Waveform(buffersize);

    osc.chain(input, scale, waveform);  

    let canvas;

    let pause = false;

    onMount(() => {
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.lineWidth = linewidth;
        

        let frame, samples, contents, prevSample;

        (function updateWaveform() {
            requestAnimationFrame(updateWaveform)
            samples = waveform.getValue();  
        }());

        
        (function loop() { 
            frame = requestAnimationFrame(loop);

            if (!pause) {
                contents = ctx.getImageData(0, 0, canvas.width, canvas.height);                               

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.putImageData(contents, -ppf, 0);
                
                ctx.beginPath();
                ctx.lineCap = "round";
                ctx.moveTo(width - ppf, prevSample);
                prevSample = 0;
                samples.forEach((sample) => prevSample = prevSample + sample);
                prevSample = prevSample / buffersize;
                ctx.lineTo(width, prevSample);          
                ctx.stroke();
            }           
            
        }());

        return () => {
            cancelAnimationFrame(frame);
        };
    });

    async function start() {
        await input.context.resume();
	    console.log('audio is ready')
    }


</script>

<canvas on:click|once={start} on:mousedown={() => pause = true} on:mouseup={() => pause = false} bind:this={canvas} height={height} width={width}></canvas>

<style>
    canvas {
        width: 100%;
        height: 20vh;
        image-rendering: optimizeSpeed;             /* Older versions of FF          */
        image-rendering: -moz-crisp-edges;          /* FF 6.0+                       */
        image-rendering: -webkit-optimize-contrast; /* Safari                        */
        image-rendering: -o-crisp-edges;            /* OS X & Windows Opera (12.02+) */
        image-rendering: pixelated;                 /* Awesome future-browsers       */
        -ms-interpolation-mode: nearest-neighbor;   /* IE                            */
    }
</style>