<template>
  <div>
    {{c}}
  </div>
</template>

<script>
import { ref } from '@vue/composition-api'
export default {
  setup() {
    const c = ref(1)
    return {
      c
    }
  }
}
</script>