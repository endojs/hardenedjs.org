---
title: SES 1.6.0
date: 2024-07-30
slug: blog/ses-1.6.0
---

[Agoric](https://agoric.com) has released `ses` version
[1.6.0](https://www.npmjs.com/package/ses/v/1.6.0) with changes that
improve compatibility with [Moddable](https://www.moddable.com/)’s XS.
The version maintains backward-compatibility with existing usage and
some usage becomes deprecated, for which support will be removed in a future,
major version.

### `__options__`

With this change, the `Compartment` constructor now has a preferred
single-argument form, which will become the only accepted form in a future,
major version.
Until then, `Compartment` accepts both the old and new signatures.

The deprecated form accepts three optional arguments:

```js
const compartment = new Compartment(globals, modules, {
  name: 'my-compartment',
});
```

The new form accepts a single options bag, and currently requires the
`__options__` option to distinguish the global endowments from an options
object.

> This is technically a breaking change, but we expect that it is vanishingly
> rare for a compartment to be endowed with an `__options__` global.
> If such code exists, it will need to adopt the new form.

```js
const compartment = new Compartment({
  __options__: true,
  name: 'my-compartment',
  globals,
  modules,
});
```

In a future, major version, the `__options__` field will become vestigial and the
three-argument form will be an error.

```js
const compartment = new Compartment({
  name: 'my-compartment',
  globals,
  modules,
});
```

### `__noNamespaceBox__`

Likewise, the `import` method of compartments currently returns a promise
for an object with a `namespace` property, which is the namespace.
This differs from XS and the behavior of standard, dynamic `import`.

```js
const compartment = new Compartment({
  __options__: true,
  modules: {
    'my-module-specifier': {
      namespace: {default: 42},
    },
  }
});
// Note the destructuring of namespace:
const { namespace } = await compartment.import('my-module-specifier');
console.log(namespace.default); // 42
```

The `import` method should simply return a promise for the module namespace
object, just like dynamic `import` and XS.

Version 1.6.0 introduces a `__noNamespaceBox__` option that makes the eventual
correct behavior available today.

```js
const compartment = new Compartment({
  __options__: true,
  __noNamespaceBox__: true,
  modules: {
    'my-module-specifier': {
      namespace: {default: 42},
    },
  }
});
// Note the absence of destructuring { namespace }:
const namespace = await compartment.import('my-module-specifier');
console.log(namespace.default); // 42
```

This will become the only supported behavior in a future, major version.

### Module descriptors

Version 1.6.0 increases module descriptor parity with XS.
[Module descriptors](https://github.com/endojs/endo/blob/master/packages/ses/README.md#module-descriptors) appear in several places in the `Compartment` interface.

- The `modules` option is an object that maps module specifiers to their
  corresponding module descriptor.
  These modules are "pre-loaded" at time of construction.
- The `moduleMapHook` is a function that accepts a module specifier and may
  return a module descriptor if `import` or `importNow` cannot complete without
  it.
- The `importHookNowHook` accepts a module specifier and may return a module
  descriptor if `importNow` cannot complete without it.
- The `importHook` accepts a module specifier and may return a module
  descriptor or a promise for a module descriptor if `import` cannot complete
  without it.

With version 1.6.0, module descriptors can take most of the forms accepted by XS
and code should begin migrating to prefer those forms.

- Prior to version 1.6.0, a `StaticModuleRecord`, `ModuleSource`, virtual
  static module record, or virtual module source could be used in place of
  a module descriptor.
  These should now be boxed in a module descriptor with a `source` property.
  (Relatedly, we have renamed the `@endo/static-module-record` package to
  `@endo/module-source` to better reflect the direction of movement in the
  ECMAScript standardization process.)

  ```js
  // before:
  import { StaticModuleRecord } from '@endo/static-module-record';
  const compartment = new Compartment(
    {},
    {
      'my-module-specifier': new StaticModuleRecord(`
        export default 42;
      `),
    },
  );
  console.log(compartment.importNow('my-module-specifier').default); // 42
  ```

  ```js
  // after
  const compartment = new Compartment({
    __options__: true,
    modules: {
      'my-module-specifier': {
        source: new ModuleSource(`
          export default 42;
        `),
      },
    },
  });
  console.log(compartment.importNow('my-module-specifier').default); // 42
  ```

- Prior to version 1.6.0, a module namespace object could be used in place
  of a module descriptor.
  Particularly, the `Compartment` implementation included a `module` method
  that could be used to acquire the module namespace object of a module that
  has not yet been loaded, such that a module namespace could be used to link
  compartments or settle cyclic dependencies.
  This practice is deprecated now in favor of using a `namespace` module
  descriptor.

  ```js
  // before:
  const c1 = new Compartment(
    {},
    {
      'c1-module-specifier': new StaticModuleRecord(`
        export default 42;
      `),
    },
  );
  const c2 = new Compartment(
    {},
    {
      'c2-module-specifier': c1.module('c1-module-specifier'),
    },
  );
  console.log(c2.importNow('c2-module-specifier').default); // 42
  ```

  ```js
  // after
  const c1 = new Compartment({
    __options__: true,
    modules: {
      'c1-module-specifier': new ModuleSource(`
        export default 42;
      `),
    },
  });
  const c2 = new Compartment({
    __options__: true,
    modules: {
      'c2-module-specifier': {
        namespace: 'c1-module-specifier',
        compartment: c1,
      },
    },
  });
  console.log(c2.importNow('c2-module-specifier').default); // 42
  ```

  Module descriptors with the `source` key will construct a fresh instance
  of the source in this compartment.
  Module descriptors with the `namespace` key will link to a module instance in
  the designated compartment.

- Prior to version 1.6.0, a module descriptor with `record` property
  could be used to instantiate a module with a different `import.meta.url` than
  the associated module specifier.
  These descriptors should migrate to `namespace` module descriptors and
  must explicitly designate the `compartment` property if they previously
  relied on the default `compartment`.
  The default compartment for `namespace` and `source` descriptors is the
  "parent compartment": the compartment for which `Compartment` is
  the initial, intrinsic `compartment.globalThis.Compartment`.
  The default compartment for `record` descriptors is child compartment.

  Because you can otherwise only refer to a compartment with a reference
  to that compartment, `source` and `namespace` descriptors that refer back to
  their own compartment, instead of the default parent compartment, are not
  expressible in the `modules` option and must move to a hook like
  `moduleMapHook`, `importHook`, or `importNowHook`.

  ```js
  // before:
  const compartment = new Compartment(
    {},
    {
      'submodule/dependency': new StaticModuleRecord(`
        export default 42;
      `),
      dependent: {
        record: new StaticModuleRecord(`
          import meaning from 'dependency';
          export default meaning;
        `),
        specifier: 'submodule/dependent',
      },
    },
    {
      resolveHook(importSpecifier, referrerSpecifier) {
        const path = referrerSpecifier.split('/');
        path.pop();
        path.push(...importSpecifier.split('/'));
        return path.join('/');
      },
    },
  );
  console.log(compartment.importNow('dependent').default); // 42
  ```

  ```js
  // after
  const compartment = new Compartment({
    __options__: true,
    modules: {
      'submodule/dependency': new ModuleSource(`
        export default 42;
      `),
    },
    importNowHook(specifier) {
      if (specifier === 'dependent') {
        return {
          source: new ModuleSource(`
            import meaning from 'dependency';
            export default meaning;
          `),
          specifier: 'submodule/dependent',
          compartment, // reflexive
        };
      }
    },
    resolveHook(importSpecifier, referrerSpecifier) {
      const path = referrerSpecifier.split('/');
      path.pop();
      path.push(...importSpecifier.split('/'));
      return path.join('/');
    },
  });
  console.log(compartment.importNow('dependent').default); // 42
  ```

Support for the deprecated forms will be removed in a future, major version.

### Line numbers

When running transpiled code on Node, the SES error taming
gives line-numbers into the generated JavaScript, which often don't match the
the original lines. This happens even with the normal development-time
lockdown options setting,

```js
errorTaming: 'unsafe'
```

or setting the environment variable

```sh
$ export LOCKDOWN_ERROR_TAMING=unsafe
```

To get the original line numbers, this release
adds `'unsafe-debug'`.
This `errorTaming: 'unsafe-debug'` setting should be used ***during development
only*** when you can sacrifice more security for a better debugging experience,
as explained at
[`errorTaming` Options](https://github.com/endojs/endo/blob/master/packages/ses/docs/lockdown.md#errortaming-options).
With this setting, when running transpiled code on Node (e.g. tests written in
TypeScript), the stacktrace line-numbers point back into the original source,
as they do on Node without SES.
