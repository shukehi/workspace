/// <reference types="vite/client" />
/// <reference types="@types/node" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string
    readonly VITE_API_KEY?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
