// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file

import { configure } from 'quasar/wrappers';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';

export default configure((ctx) => {
  return {
    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    // preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: ['i18n', 'axios', 'element-plus'],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#css
    // CSS 文件现在直接在 App.vue 中通过相对路径导入
    // css: [],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      // 'mdi-v7',
      // 'fontawesome-v6',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      'roboto-font', // optional, you are not bound to it
      'material-icons', // optional, you are not bound to it
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#build
    build: {
      target: {
        browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
        node: 'node20',
      },

      typescript: {
        strict: true,
        vueShim: true,
        // extendTsConfig (tsConfig) {}
      },

      vueRouterMode: 'hash', // available values: 'hash', 'history'
      // vueRouterBase,
      // vueDevtools,
      // vueOptionsAPI: false,

      // rebuildCache: true, // rebuilds Vite/linter/etc cache on startup

      // publicPath: '/',
      // analyze: true,
      // env: {},
      // rawDefine: {}
      // ignorePublicFolder: true,
      // minify: false,
      // polyfillModulePreload: true,
      // distDir

      extendViteConf(viteConf) {
        viteConf.resolve = viteConf.resolve || {};
        // 使用数组并控制顺序，确保更具体规则优先（参考 Nimbria 的实现）
        const alias = [];
        alias.push(
          // 基础别名（保持 Quasar 模板兼容性，带 src/ 前缀）
          { find: 'src/boot', replacement: path.resolve(__dirname, 'Frontend/boot') },
          { find: 'src/stores', replacement: path.resolve(__dirname, 'Frontend/GUI/stores') },
          { find: 'src', replacement: path.resolve(__dirname, 'Frontend') },
          { find: 'app/src', replacement: path.resolve(__dirname, 'Frontend') },
          { find: 'app', replacement: path.resolve(__dirname, '.') },
          
          // Quasar 标准别名（不带前缀，Quasar 生成的文件会使用这些）
          { find: 'boot', replacement: path.resolve(__dirname, 'Frontend/boot') },
          { find: 'layouts', replacement: path.resolve(__dirname, 'Frontend/GUI/layouts') },
          { find: 'pages', replacement: path.resolve(__dirname, 'Frontend/GUI/pages') },
          { find: 'components', replacement: path.resolve(__dirname, 'Frontend/GUI/components') },
          { find: 'stores', replacement: path.resolve(__dirname, 'Frontend/GUI/stores') },
          
          // GUI 层别名（使用 @ 前缀）
          { find: '@gui', replacement: path.resolve(__dirname, 'Frontend/GUI') },
          { find: '@gui/types', replacement: path.resolve(__dirname, 'Frontend/GUI/types') },
          { find: '@gui/pages', replacement: path.resolve(__dirname, 'Frontend/GUI/pages') },
          { find: '@gui/components', replacement: path.resolve(__dirname, 'Frontend/GUI/components') },
          { find: '@gui/stores', replacement: path.resolve(__dirname, 'Frontend/GUI/stores') },
          { find: '@gui/service', replacement: path.resolve(__dirname, 'Frontend/GUI/service') },
          
          // 核心功能别名（使用 @ 前缀）
          { find: '@router', replacement: path.resolve(__dirname, 'Frontend/router') },
          { find: '@boot', replacement: path.resolve(__dirname, 'Frontend/boot') },
          { find: '@i18n', replacement: path.resolve(__dirname, 'Frontend/i18n') },
          { find: '@types', replacement: path.resolve(__dirname, 'public/types') },
          { find: /^@types\//, replacement: path.resolve(__dirname, 'public/types/') }
        );
        viteConf.resolve.alias = alias;

        // Element Plus 自动导入配置
        viteConf.plugins = viteConf.plugins || [];
        viteConf.plugins.push(
          AutoImport({
            resolvers: [ElementPlusResolver()],
          }),
          Components({
            resolvers: [ElementPlusResolver()],
          })
        );
      },
      // viteVuePluginOptions: {},

      vitePlugins: [
        [
          '@intlify/unplugin-vue-i18n/vite',
          {
            // if you want to use Vue I18n Legacy API, you need to set `compositionOnly: false`
            // compositionOnly: false,

            // if you want to use named tokens in your Vue I18n messages, such as 'Hello {name}',
            // you need to set `runtimeOnly: false`
            // runtimeOnly: false,

            ssr: ctx.modeName === 'ssr',

            // you need to set i18n resource including paths !
            include: [fileURLToPath(new URL('./Frontend/i18n', import.meta.url))],
          },
        ],

        [
          'vite-plugin-checker',
          {
            vueTsc: process.env.SKIP_LINT === 'true' ? false : true,
            eslint: process.env.SKIP_LINT === 'true' ? false : {
              lintCommand: 'eslint -c ./eslint.config.js "./Frontend*/**/*.{ts,js,mjs,cjs,vue}"',
              useFlatConfig: true,
            },
          },
          { server: false },
        ],
      ],
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#devserver
    devServer: {
      // https: true,
      open: true, // opens browser window automatically
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#framework
    framework: {
      config: {},

      // iconSet: 'material-icons', // Quasar icon set
      // lang: 'en-US', // Quasar language pack

      // For special cases outside of where the auto-import strategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //
      // components: [],
      // directives: [],

      // Quasar plugins
      plugins: ['Dialog', 'Notify'],
    },

    // animations: 'all', // --- includes all animations
    // https://v2.quasar.dev/options/animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#sourcefiles
    sourceFiles: {
      rootComponent: 'Frontend/App.vue',
      router: 'Frontend/router/index',
      store: 'Frontend/GUI/stores/index',
      // pwaRegisterServiceWorker: 'src-pwa/register-service-worker',
      // pwaServiceWorker: 'src-pwa/custom-service-worker',
      // pwaManifestFile: 'src-pwa/manifest.json',
      // electronMain: 'src-electron/electron-main',
      // electronPreload: 'src-electron/electron-preload'
      // bexManifestFile: 'src-bex/manifest.json
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr
    ssr: {
      prodPort: 3000, // The default port that the production server should use
      // (gets superseded if process.env.PORT is specified at runtime)

      middlewares: [
        'render', // keep this as last one
      ],

      // extendPackageJson (json) {},
      // extendSSRWebserverConf (esbuildConf) {},

      // manualStoreSerialization: true,
      // manualStoreSsrContextInjection: true,
      // manualStoreHydration: true,
      // manualPostHydrationTrigger: true,

      pwa: false,
      // pwaOfflineHtmlFilename: 'offline.html', // do NOT use index.html as name!

      // pwaExtendGenerateSWOptions (cfg) {},
      // pwaExtendInjectManifestOptions (cfg) {}
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-pwa/configuring-pwa
    pwa: {
      workboxMode: 'GenerateSW', // 'GenerateSW' or 'InjectManifest'
      // swFilename: 'sw.js',
      // manifestFilename: 'manifest.json',
      // extendManifestJson (json) {},
      // useCredentialsForManifestTag: true,
      // injectPwaMetaTags: false,
      // extendPWACustomSWConf (esbuildConf) {},
      // extendGenerateSWOptions (cfg) {},
      // extendInjectManifestOptions (cfg) {}
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-cordova-apps/configuring-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true,
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/configuring-electron
    electron: {
      // extendElectronMainConf (esbuildConf) {},
      // extendElectronPreloadConf (esbuildConf) {},

      // extendPackageJson (json) {},

      // Electron preload scripts (if any) from /src-electron, WITHOUT file extension
      // 注意：路径相对于 src-electron，不要包含扩展名
      preloadScripts: ['electron-preload', 'Preload/overlay'],

      // specify the debugging port to use for the Electron app when running in development mode
      inspectPort: 5858,

      bundler: 'packager', // 'packager' or 'builder'

      packager: {
        // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options
        // OS X / Mac App Store
        // appBundleId: '',
        // appCategoryType: '',
        // osxSign: '',
        // protocol: 'myapp://path',
        // Windows only
        // win32metadata: { ... }
        
        // 额外资源：Python 自动化服务 exe
        extraResource: [
          'public/automation-service'
        ]
      },

      builder: {
        // https://www.electron.build/configuration/configuration

        appId: 'satisfactoryblueprintmanager',
        productName: 'SatisfactoryBlueprintManager',
        
        // 输出目录
        directories: {
          output: 'dist/electron/Installer'
        },
        
        // Windows 平台配置
        win: {
          target: [
            {
              target: 'nsis',
              arch: ['x64']
            }
          ],
          icon: 'src-electron/icons/icon.ico'
        },
        
        // NSIS 安装程序配置
        nsis: {
          // 安装程序文件名
          artifactName: '${productName}-Setup-${version}.${ext}',
          // 一键安装模式（不需要用户选择安装目录）
          oneClick: false,
          // 允许用户选择安装目录
          allowToChangeInstallationDirectory: true,
          // 创建开始菜单快捷方式
          createDesktopShortcut: true,
          // 创建开始菜单项
          createStartMenuShortcut: true,
          // 安装完成后运行应用
          runAfterFinish: true,
          // 卸载程序名称
          uninstallDisplayName: '${productName}',
          // 安装程序语言
          language: '2052', // 简体中文
          // 安装向导图标
          installerIcon: 'src-electron/icons/icon.ico',
          // 卸载向导图标
          uninstallerIcon: 'src-electron/icons/icon.ico',
          // 安装程序头部图标
          installerHeaderIcon: 'src-electron/icons/icon.ico',
          // 安装程序侧边栏图片（可选）
          // installerSidebar: 'build/installer-sidebar.bmp',
          // 卸载程序侧边栏图片（可选）
          // uninstallerSidebar: 'build/uninstaller-sidebar.bmp',
          // 安装程序欢迎页面文本（可选）
          // include: 'build/installer.nsh',
          // 自定义安装脚本（可选）
          // script: 'build/installer.nsh'
        },
        
        // 额外资源：Python 自动化服务 exe
        extraResources: [
          {
            from: 'public/automation-service',
            to: 'automation-service'
          }
        ]
      },
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-browser-extensions/configuring-bex
    bex: {
      // extendBexScriptsConf (esbuildConf) {},
      // extendBexManifestJson (json) {},

      /**
       * The list of extra scripts (js/ts) not in your bex manifest that you want to
       * compile and use in your browser extension. Maybe dynamic use them?
       *
       * Each entry in the list should be a relative filename to /src-bex/
       *
       * @example [ 'my-script.ts', 'sub-folder/my-other-script.js' ]
       */
      extraScripts: [],
    },
  };
});
