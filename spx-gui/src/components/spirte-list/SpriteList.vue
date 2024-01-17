<template>
  <div>Display SpriteList</div>
</template>

<script setup>
// ----------Import required packages / components-----------
import {computed, onMounted, ref} from "vue";
// import aaa;

// ----------props & emit-------------------------
const props = defineProps({ spriteName: String }); // Props based on type declaration
const emit = defineEmits(['update']);

// ----------data related (reactive, ref..)-----------
const count = ref(0);

// ----------computed properties------------------
const doubled = computed(() => count.value * 2);

// ----------lifecycle hooks-----------------------
onMounted(() => { console.log('Component is mounted!'); });

// ----------other composition functions-----------
// Such as useRouter, useStore..

// ----------methods, relevant methods as much as possible in context------------
</script>
