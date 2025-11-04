import { boot } from 'quasar/wrappers'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

export default boot(({ app }) => {
  app.use(ElementPlus, {
    size: 'default',
    zIndex: 3000,
  })
})

