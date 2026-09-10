<template>

  <div>
    <div>
      {{ a }}
    </div>
    <div>{{ b.age }}</div>
    <AC />
  </div>
</template>

<script>
import AC from './AC.vue'
export default {
  components: {
    AC
  },
  data() {
    return {
      a: 1,
      b: {
        age: 22
      }
    }
  }
}
</script>