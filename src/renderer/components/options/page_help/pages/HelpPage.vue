<!--
	HelpPage.vue
	------------

	Page with mostly text content to help users understand the plugin.
-->
<template>

	<PageBox
		title="Help"
		themeColor="#00ABAE"
	>
		<div class="picBox" :style="{ height: '350px',}">
			<img src="/assets/half_tone/help.png" height="300px" style="float:right"/>
		</div>
		
		<br>
		<p>
			Welcome to the ToyBox plugin! This plugin is designed to help you interact with your viewers in fun and engaging ways.
		</p>

		<SectionHeader title="CatsumIpsum"/>
		<CatsumIpsum :paragraphs="5" :sentences="10"/>
	</PageBox>

</template>
<script setup>

// vue
import { ref } from 'vue';

// components
import PageBox from '../../PageBox.vue';
import SectionHeader from '../../SectionHeader.vue';
import InfoBox from '../../InfoBox.vue';
import CatsumIpsum from '../../../CatsumIpsum.vue';


</script>
<style lang="scss" scoped>	


</style>
