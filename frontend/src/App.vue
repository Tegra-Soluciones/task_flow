<template>
  <RouterView />
</template>

<script setup>
import { RouterView } from "vue-router";
import { useAppStore } from "./stores/app.js";
useAppStore();
</script>
