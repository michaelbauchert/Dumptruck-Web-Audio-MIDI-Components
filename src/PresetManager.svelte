<svelte:options tag="dt-preset-manager" />

<svelte:window on:load|once={() => {
	if(!presets["default"] && elements.length > 0)
		savePreset("default", false);
}}></svelte:window>

<script>
	//Dialog Objects
	let saveAsDialog, overwriteDialog, deleteDialog;

	//variables for saving and save-as-ing presets
	let newPresetName, presetToOverwriteIndex, newPreset, radioPresetNames;

	$: {
		newPresetName = radioPresetNames;
	}

	export let elements = [];
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
	$: if(selectedPresetIndex !== 0) {
		setToPreset(selectedPresetIndex)
	};

	function setToPreset(index, newPreset = false) {
			const presetElements = presets[index].presetElements;
			for(let selector in presetElements) {
				const attributeValueArr = presetElements[selector];
				attributeValueArr.forEach(
					(o) => {
						document.querySelector(selector)[o.attribute] = o.value;
					}
				);//end for each
			}//end for
	}//end setToPreset

	function createNewPreset(name, writable) {
		let newPreset =
		{
			name: name,
			writable: writable,
			presetElements: {}
		};

		elements.forEach(
			(e) => {
				const elementDOM = document.querySelector(e.selector);
				newPreset["presetElements"][e.selector] = [];

				e.attributes.forEach(
					(a) => {
						const newAttributeValue = {
							attribute: a,
							value: elementDOM[a]
						};
						newPreset["presetElements"][e.selector].push(newAttributeValue);
					}//end (a) =>
				);//end for each element's attributes
			}//end (e, i) =>
		);//end for each element

		return newPreset;
	}//end createNewPreset

	function savePreset(name, writable) {
		let existingPresetIndex, existingPresetWritable;

		let foundExisting = presets.find((o, i) => {
			if (o.name === name) {
					existingPresetIndex = i;
					existingPresetWritable = o.writable;
					return true; // stop searching
			}//end if
		});//end find

		if(!foundExisting) {
			presets = [...presets, createNewPreset(name, writable)];
			selectedPresetIndex = presets.length - 1;
		}	else if (existingPresetWritable) {
			presetToOverwriteIndex = existingPresetIndex;
			newPreset = createNewPreset(name, writable);
			overwriteDialog.open = true;
		}
	}//end set preset

	function openSaveDialog() {
		radioPresetNames = null;
		newPresetName = null;
		saveAsDialog.open = true;
	}//end openSaveDialog
</script>

<span>
	<select bind:value={selectedPresetIndex}>
		{#each presets as preset, i}
			<option value={i} disabled={i === 0 }>{preset.name}</option>
		{/each}
	</select>

	<button on:click={openSaveDialog}>
		<slot name="save">
			Save
		</slot>
	</button>

	<button disabled={!presets[selectedPresetIndex].writable}
					on:click={() => deleteDialog.open = true}>
		<slot name="delete">
			Delete
		</slot>
	</button>
</span>

<dialog bind:this={saveAsDialog}>
	<div>Save Preset As</div>
	<form method="dialog" on:submit={(e) => console.log(e.target.returnValue)}>
		<div class="save_overwriteSelect">
			{#each presets as preset, i}
				{#if i !== 0}
					<input type=radio
								 name="presetOverwrite"
								 id={preset.name + "radio"}
								 bind:group={radioPresetNames}
								 value={preset.name}
								 disabled={!preset.writable}>
					<label for={preset.name + "radio"}>{preset.name}</label>
				{/if}
			{/each}
		</div>
		<label>
			Preset Name:
			<input type="text" name="preset" bind:value={newPresetName}>
		</label>
		<div class="save_buttons">
			<button on:click={savePreset(newPresetName, true)}>Save</button>
			<button>Cancel</button>
		</div>
	</form>
</dialog>

<dialog bind:this={overwriteDialog}>
	<p>Are you sure you want to overwrite <strong>{newPresetName}</strong>?</p>
	<form method="dialog">
		<div>
			<button on:click={() => presets[presetToOverwriteIndex] = newPreset}>Overwrite</button>
			<button>Cancel</button>
		</div>
	</form>
</dialog>

<dialog bind:this={deleteDialog}>
	<p>Are you sure you want to delete <strong>{presets[selectedPresetIndex].name}</strong>?</p>
	<form method="dialog">
		<div>
			<button on:click={() => { presets.splice(selectedPresetIndex, 1);
																presets = presets;
																selectedPresetIndex = 0;}}>Delete</button>
			<button>Cancel</button>
		</div>
	</form>
</dialog>

<style>
	dialog {
		z-index: 9999;
		position: fixed;
		top: 50%;
		transform-origin: 50% 50%;
		transform: translateY(-50%)
	}

	.save_buttons {
		width: 100%;
	}

	.save_overwriteSelect {
		max-height: 50vh;
		overflow-y: auto;
		background: #F8F8F8;
		border: 1px solid #ccc;
		margin: 0.5rem 0;

	}

	.save_overwriteSelect label {
		padding: 0.5rem;
	}

	.save_overwriteSelect label:hover {
		background: WhiteSmoke;
	}

	input[type="radio"]:checked + label {
		background: LightGray;
	}

	input[type="radio"] {
		position: absolute;
		opacity: 0;
		height: 0;
		width: 0;
	}
</style>
