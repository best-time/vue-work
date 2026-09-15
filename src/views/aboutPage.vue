<template>
    <div class="about-container">
        About
				<div>
					{{ a.info.b }}
					<el-button type="primary" @click="cc">点击</el-button>
				</div>
    </div>
</template>

<script>
import { reactive } from 'vue-demi';

export default {
	setup() {
		const a = reactive({
			age: 1,
			info: {
				name: 'aaa',
				b: 'ccc',
				d:566
			}
		})

		const cc = () => {
			console.log(Math.random() + 1)
		}
		return {
			a,
			cc
		}
	}
}
</script>