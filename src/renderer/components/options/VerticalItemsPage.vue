<!--
	VerticalItemsPage.vue
	---------------------

	A simple wrapper for pages that want to implement the vertical item strip.
-->
<template>

	<!-- main outermost wrapper for a 'page' -->
	<div class="verticalItemsPage">

		<VerticalItemStrip
			class="vItemsStrip"
			:vItems="verticalItems"
			:selectedItemSlug="selectedTab"
			:showAdd="showAddButton"
			:showDelete="showDeleteButton"
			:iconPath="'assets/icons'"
			@selectItem="(tab)=>emit('changeTab', tab.slug)"
			@addItem="()=>emit('addItem')"
			@removeItem="(item)=>emit('removeItem', item.slug)"
		/>

		<!-- the main area where the selected toys appear -->
		<div ref="mainArea" class="contentPageArea">

			<!-- area that will be used to -->
			<div class="actualContent">
				<slot/>
			</div>
		</div>

	</div>

</template>
<script setup>

// vue
import { ref, shallowRef, markRaw, watch, computed } from 'vue';

// components
import VerticalItemStrip from './VerticalItemStrip.vue';

// props
const props = defineProps({

	// the list of items to show in the vertical strip
	verticalItems: {
		type: Array,
		default: []
	},

	// what's the currently tab?
	selectedTab: {
		type: String,
		default: ''
	},

	// should we show the add button?
	showAddButton: {
		type: Boolean,
		default: false
	},

	// show delete buttons
	showDeleteButton: {
		type: Boolean,
		default: false
	}
});

// events
const emit = defineEmits(['changeTab', 'addItem', 'removeItem']);

</script>
<style lang="scss" scoped>

	// the main page wrapper
	.verticalItemsPage {

		.contentPageArea {

			/* border: 1px solid magenta; */			

			// fill right side of screen
			position: absolute;
			inset: 0px 0px 0px 100px;
			overflow: hidden;
			overflow-y: auto;

			transition: inset 0.4s ease-in-out;
			
			// force tool strip on left side
			.vItemsStrip {
				position: absolute;
				inset: 0px auto 0px 0px;
			}

			.actualContent {

				width: 1450px;
				min-width: 1100px;
				max-width: 1500px;
				min-height: 100%;

				/* display: none; */
				background: white;

				// padding for contents (which will always be a PageBox, etc)
				padding: 20px 30px 30px 30px;

			}// .actualContent

		}// .contentPageArea

	}// .verticalItemsPage

	@media (max-width: 1599px) {
		
		.contentPageArea {

			.actualContent {
				width: auto !important;
			
			}// .actualContent

		}// .contentPageArea
	}

</style>
