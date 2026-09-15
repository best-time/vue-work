<template>
  <div>
    {{c}}
  </div>
</template>

<script>
import { ref, reactive, watch, onMounted } from 'vue-demi'

export default {
  setup() {
    const c = ref(1)

    const d = reactive({
      name: '张三',
      age: 18
    })

    watch(() => c.value, nv => {
      console.log(nv, 'nv');
    })

    watch(() => d.age, nv => {
      console.log(nv, 'nv222');
    })

    onMounted(() => {
      setTimeout(()=> {
        c.value = 2
        d.age += 1
      }, 1000)
    })
    return {
      c,
      d
    }
  }
}
</script>