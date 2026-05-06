import { createApp } from 'vue'
import FloatingVue from 'floating-vue'
import 'floating-vue/dist/style.css'
import 'highlight.js/styles/github.css'
import 'katex/dist/katex.min.css'
import './style.css'
import App from './App.vue'

createApp(App).use(FloatingVue).mount('#app')
