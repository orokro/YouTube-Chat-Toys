<!--
	VideoHelpPage.vue
	-----------------

	Shows page with useful videos on how to use the plugin.
-->
<template>

	<PageBox
		title="Video Help"
		themeColor="#00ABAE"
	>
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
