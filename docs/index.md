---
layout: home
---

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // Automatically redirect to English version
  if (typeof window !== 'undefined') {
    window.location.href = '/kori/en/'
  }
})
</script>

<style>
.VPHome {
  opacity: 0;
}
</style>
