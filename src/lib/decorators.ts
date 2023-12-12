type Hook = (...args: unknown[]) => void | Promise<void>;

/**
 * Adding hooks to be executed prior to the original method.
 *
 * @param hooks
 * @returns
 */
export function withHooks(hooks: Hook[]) {
    return (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value!;
        descriptor.value = function wrapper(...args) {
            const promise = hooks.reduce((promise: Promise<void> | null, hook: Hook) => {
                if (promise) {
                    return promise.then(() => hook.apply(this, args));
                }
                const result = hook.apply(this, args);
                return result?.then ? result : null;
            }, null);

            if (promise) {
                return promise.then(() => originalMethod.apply(this, args));
            }

            return originalMethod.apply(this, args);
        };
        return descriptor;
    };
}
