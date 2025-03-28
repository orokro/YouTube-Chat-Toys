<!--
	Chat BoxPage.vue
	----------------

	This is the settings page for the Chat Box system.
-->
<template>

	<PageBox
		title="Chat Box Settings"
		themeColor="#60C5F1"
	>
		<p>
			The Chat Box system allows you to show a customized chat capture on screen.
			However, it also has two special chat commands:
		</p>
		<ul>
			<li>
				<span class="cmd">!{{ shout_command }}</span> - similar to SuperChat but spends channel points.
				Allows a chat message to be played on screen with a sound.
			</li>
			<li>
				<span class="cmd">!{{ swarm_command }} &lt;message&gt;</span> - By itself, does nothing.
				But if a critical number of chatters all start typing 
				<span class="cmd">!{{ swarm_command }} &lt;message&gt;</span> at the same time,
				then the messages will appear randomly on screen, like a swarm of chat.
			</li>
		</ul>
		<SectionHeader title="Command Triggers"/>
		<p>
			Below you can customize the commands that users can type to interact with the Chat system.
		</p>
		<CommandsConfigBox
			:toyName="'Chat'"
			:toySlug="toySlug"
			:commands="commands"
		/>
			
		<SectionHeader title="Settings"/>
		<SettingsInputRow
			type="boolean"
			v-model="enableChatBox"
		>
			<h3>Enable Onscreen Chat Box</h3>
			<p>Show chat box on screen mirroring live chat (as opposed to other streaming services)</p>
		</SettingsInputRow>
		<SettingsInputRow
			type="boolean"
			v-model="enableChatBox"
		>
			<h3>Enable Onscreen Chat Box</h3>
			<p>Show chat box on screen mirroring live chat (as opposed to other streaming services)</p>
		</SettingsInputRow>
		<SettingsAssetRow
			v-model="chatBoxImage"
			:kind-filter="'image'"
		>
			<h3>Image Frame</h3>
			<p>Choose Image frame (sliceable in 3x3) for chat box.</p>
		</SettingsAssetRow>
		<SettingsInputRow
			type="boolean"
			v-model="filterCommands"
		>
			<h3>Filter !commands from Chat</h3>
			<p>If using the custom streaming box, filter out the <span class="cmd">!Commands</span>.</p>
		</SettingsInputRow>
		<SettingsInputRow
			type="boolean"
			v-model="showChatterNames"
		>
			<h3>Show Chatter Names</h3>
			<p>Disable to show messages only.</p>
		</SettingsInputRow>
		<SettingsInputRow
			type="color"
			v-model="chatNameColor"
		>
			<h3>User Name Chat Color</h3>
			<p>What color to use for chat's user names?</p>
		</SettingsInputRow>
		<SettingsInputRow
			type="color"
			v-model="chatTextColor"
		>
			<h3>Chat Text Color.</h3>
			<p>What color to use for message text?</p>
		</SettingsInputRow>
		<SettingsAssetRow
			v-model="shoutSoundId"
			:kind-filter="'sound'"
		>
			<h3>Shout Sound</h3>
			<p>What sound effect should play when <span class="cmd">!{{ shout_command }}</span> command is used.</p>
		</SettingsAssetRow>
		<SettingsInputRow
			type="number"
			:min="1"
			v-model="swarmSize"
		>
			<h3>Swarm Size</h3>
			<p>
				If the <span class="cmd">!{{ swarm_command }}</span> command is enabled, how many users need to use it
				in a short period of time for a swarm to start?
			</p>
			<p>The time period can be customized below...</p>
		</SettingsInputRow>
		<SettingsInputRow
			type="number"
			:min="1"
			v-model="swarmDuration"
		>
			<h3>Swarm Time Window</h3>
			<p>
				Used with the above setting, how long of window should be used to
				count the number of users using the <span class="cmd">!{{ swarm_command }}</span> command?
			</p>
			<p>The number of users can be customized above...</p>
		</SettingsInputRow>

	</PageBox>

</template>
<script setup>

// vue
import { ref, shallowRef, computed, inject } from 'vue';
import { chromeRef, chromeShallowRef } from '../../../../scripts/chromeRef';

// components
import PageBox from '../../PageBox.vue';
import SectionHeader from '../../SectionHeader.vue';
import InfoBox from '../../InfoBox.vue';
import CommandsConfigBox from '../../CommandsConfigBox.vue';
import SettingsRow from '../../SettingsRow.vue';
import SettingsInputRow from '../../SettingsInputRow.vue';
import SettingsAssetRow from '../../SettingsAssetRow.vue';

// fetch the main app state context
const ctApp = inject('ctApp');

// generate slug for command
const toySlug = 'chat_box';
const slugify = (text) => (toySlug + '__' + text.toLowerCase());

// our local refs state
const {
	enableChatBox,
	chatBoxImage,
	filterCommands,
	showChatterNames,
	chatNameColor,
	chatTextColor,
	shoutSoundId,
	swarmSize,
	swarmDuration,
	chatWidgetBox,
	shoutWidgetBox
} = ctApp.toySettings.chatSettings;


// we'll define our commands here
// NOTE: these are the DEFAULTS, the actual commands will be loaded from storage
// in the CommandsConfigBox component
const commands = [
	{
		slug: slugify('shout'),
		command: 'shout',
		params: [
			{ name: 'message', type: 'string', optional: false, desc: 'The message a chatter will "shout"' },
		],
		description: 'A chatter can shout a message in exchange for channel points',
		enabled: true,
		costEnabled: true,
		cost: 0,
		coolDown: 0,
		groupCoolDown: 0,
	},
	{
		slug: slugify('swarm'),
		command: 'swarm',
		params: [
			{ name: 'message', type: 'string', optional: false, desc: 'The message a chatter will "swarm"' },
		],
		description: 'If enough chatters swarm at once, their messages will appear on screen',
		enabled: true,
		costEnabled: true,
		cost: 0,
		coolDown: 0,
		groupCoolDown: 0,
	}
];

// all of the commands system wide are stored in this chrome shallow ref
const commandsRef = chromeShallowRef('commands', {});

// get the command used for tossing items
const shout_command = computed(() => {
	return commandsRef.value.chat_box_shout?.command || '';
});
const swarm_command = computed(() => {
	return commandsRef.value.chat_box_swarm?.command || '';
});


</script>
<style lang="scss" scoped>	


</style>
