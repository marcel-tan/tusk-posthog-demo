import { afterMount, BuiltLogic } from 'kea'
/**
 * Some kea logics are used heavily across multiple areas so we keep it mounted once loaded with this trick.
 */
export function permanentlyMount(): (logic: BuiltLogic) => void {
    // [UseTusk]
    // This function creates a logic builder for permanent mounting and needs testing for mount/unmount scenarios
    return (logic) => {
        afterMount(() => {
            if (!logic.cache._permanentMount) {
                logic.cache._permanentMount = true
                logic.wrapper.mount()
            }
        })(logic)
    }
}
