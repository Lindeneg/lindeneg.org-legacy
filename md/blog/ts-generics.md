---
title: TypeScript Generics
published: true
datePublished: 1647786819320
author: Christian Lindeneg
tags:
  - programming
  - typescript
  - generics
authorPhoto: /img/profile.jpg
thumbnailPhoto: /img/typescript.png
canonicalUrl: https://lindeneg.org/blog/ts-generics
---

### Table of Contents

- [Introduction](#intro)
- [Objective](#objective)
- [Setup](#setup)
- [Lets Start!](#start)
  - [Generics](#generics)
  - [Constraints](#constraints)
  - [Cache Data Type](#cache-data-type)
  - [Cache Config](#cache-config)
  - [Methods](#methods)

### <a name="intro"></a>Introduction

Generic types is an important and powerful concept. It allows you to abstract type-specific logic into something that can be used across multiple types. In other words, you can turn the type constraints of your logic into something _generic_.

The best way to understand all of this, I believe is to create something! So we're going to build a simple yet type-safe <a href="https://en.wikipedia.org/wiki/Cache_(computing)" target="_blank" rel="noreferrer">cache</a>.

### <a name="objective"></a>Objective

- Create a cache that stores data in-memory
- Save entries as a key/value pair
- Allow read and write operations
- Make the cache type-safe:
  - By accepting a generic type for cache entries
  - Or by inferring the types from an `initialData` argument
- Implement <a href="https://en.wikipedia.org/wiki/Time_to_live" target="_blank" rel="noreferrer">TTL</a> functionality
- Test all functionality with `Jest`

### <a name="setup"></a>Setup

##### Create a new directory

```bash
mkdir ts-generics && cd ts-generics
```

##### Initialize `TypeScript` and `Jest`

The latter we're going to use for testing.

```bash
yarn init -y && yarn add -D typescript jest @types/jest @types/node && yarn run tsc --init
```

##### Create initial file

```bash
mkdir src && touch src/cache.ts
```

### <a name="start"></a>Lets Start!

##### <a name="generics"></a>Generics

Lets start by creating our `CustomCache` class.

```ts
// ./src/cache.ts

class CustomCache {
  constructor() {}
}
```

We'd like to support the ability to initialize the cache with some data. Thus, we need our `constructor`, to take an argument. But what should the type be? Well, in reality we don't know yet. We'd like the consumer to be able to use the type they want. That's where generics comes into the picture and provides a beautiful solution.

If we allow our `CustomCache` to take a generic type, then we could use that type to annotate the initial data argument in the `constructor`. This way, we achieve the flexibility of allowing consumers to use the types they want within the `CustomCache` class.

```ts
class CustomCache<T> {
  private data: T;
  constructor(initialData: T) {
    this.data = initialData;
  }
}
```

However, if we think about it, there's a problem here. What possible types could `T` be? Well, we don't know until someone initializes the cache and passes the `initialData` argument from which the `data` type can be inferred from.

In other words, if someone does this

```
const cache = new CustomCache(false);
```

Then `data` has the inferred type `boolean`. That is not nice because we'd like to have a key/value pair, or a `Record`, as the `data` structure.

Optimally, the possible types of `T` should be constrained to an object shape.

##### <a name="constraints"></a>Constraints

In TypeScript, we can use `extends` to constrain a generic type to a certain set of types. If we have a function like this

```ts
const fn = <T>(arg: T) => {};
```

Then it's actually the same as this

```ts
const fn = <T extends unknown>(arg: T) => {};
```

That means that essentially any type is accepted and we can do

```ts
// valid
fn(false);

// valid
fn('miles');

// valid
fn([1, 2, 3]);

// valid
fn({
  hello: 'there',
});
```

Thus, `unknown` is not really a useful constraint for our purposes, it's the largest type space there is. Lets limit the type space into an arbitrary object type. A type that describes an object shape could be like so:

```ts
type EmptyObj = Record<string | number | symbol, unknown>;
```

In other words, it's a `Record` whose keys are either a `string`, `number` or `symbol`, also called a `Union` type, and whose values are `unknown`.

If we constrain the generic `T` in the function parameter to an `EmptyObj`

```ts
const fn = <T extends EmptyObj>(arg: T) => {};
```

_Do note that using an `Interface` as a generic argument instead of using `type` or `inference`, does by default not satisfy this constraint. We'll talk more about that later._

Then only the last example is valid, because it's the only one that satisfies the type constraint

```ts
// error
fn(false);

// error
fn('miles');

// error
fn([1, 2, 3]);

// valid
fn({
  hello: 'there',
});
```

This is the start to understanding an incredibly powerful concept. Now we can constrain `data` to an `EmptyObj` and ensure that while the consumer can have the flexibility of choosing different types, they are always constrained to an object shape.

```ts
// ./src/types.ts
export type EmptyObj = Record<string | number | symbol, unknown>;
```

```ts
import type { EmptyObj } from './types';

class CustomCache<T extends EmptyObj> {
  private data: T;
  constructor(initialData: T) {
    this.data = initialData;
  }
}
```

Before we move on, lets take a moment to think about something.

##### <a name="cache-data-type"></a>Cache Data Type

We have two ways to initialize our cache.

```ts
const cache1 = new Cache(initialData);
const cache2 = new Cache<SomeCacheType>(initialData);
```

First of all, we can see that `initialData` is always required, which is not desireable. We want consumers to be able to pass no arguments.

If we also consider the last example, `cache2`, and our current `CustomCache` implementation, then consumers always have to use the entire described cache in the initialData argument, instead of being able to partially use it, which is the desired outcome.

A solution could look like this

```ts
class CustomCache<T extends EmptyObj> {
  private data: Partial<T>;
  constructor(initialData?: Partial<T>) {
    this.data = initialData || {};
  }
}
```

Now there's four ways to initialize our cache

```ts
// consumer pass nothing on
const cache1 = new Cache();

// consumer pass an object containing some initial data
// we are able to infer the types in that object
const cache2 = new Cache(initialData);

// consumer pass on a generic argument
// we use that as the T in our CustomCache
const cache3 = new Cache<SomeCacheType>();

// consumer uses both generics and initialData
// we use the generic argument as T and we
// can ensure that the passed on initialData
// actually overlaps with that type
const cache3 = new Cache<SomeCacheType>(initialData);
```

Great. Lets also think about the cache entries themselves.

We want each entry to be associated with a time-to-live, or `TTL`, timestamp and if the entry has been outdated, we want to ignore/delete it.

We should create a new `CacheEntry` type that describes the shape of each.. well cache entry.

```ts
// ./src/types.ts

export type CacheEntry<T> = {
  expires: number;
  value: T;
};

export type CacheData<T extends EmptyObj> = Partial<{
  [K in keyof T]: CacheEntry<T[K]>;
}>;
```

`CacheData` takes the same constraint as `initialData` but we map over the type and ensure that each property is optional and if defined, resolves to a `CacheEntry`.

##### <a name="cache-config"></a>Cache Config

Since we've introduced `TTL`, we should probably allow consumers to define a value for their needs. Thus, we could define a `CacheConfig` type and utilize our previously declared types

```ts
// ./src/types.ts

export type CacheConfig<T extends EmptyObj> = {
  trim: number; // in seconds
  ttl: number; // in seconds
  data: Partial<T>;
};
```

Our `CustomCache` can now use the new types like so

```ts
import type { CacheConfig, CacheData } from './types';

class CustomCache<T extends EmptyObj> {
  private data: CacheData<T>;
  private config: Omit<CacheConfig<T>, 'data'>;

  constructor({
    data = {},
    ttl = 3600,
    trim = 600,
  }: Partial<CacheConfig<T>> = {}) {
    this.config = { ttl, trim };
    this.data = data; // now this will throw an error
  }
}
```

We'll have to convert the `data` given to us by the consumer to our `CacheEntry` type.

```ts
class CustomCache<T extends EmptyObj> {
  private data: CacheData<T>;
  private config: Omit<CacheConfig<T>, 'data'>;

  constructor({
    data = {},
    ttl = 3600,
    trim = 600,
  }: Partial<CacheConfig<T>> = {}) {
    this.config = { ttl, trim };
    this.data = this.mapInitialData(data);
  }

  private mapInitialData = (data: Partial<T>): CacheData<T> => {
    const result: CacheData<T> = {};
    return Object.keys(data).reduce((a, c) => {
      return {
        ...a,
        [c]: this.createEntry(data[c]),
      };
    }, result);
  };

  private createEntry = <T>(value: T): CacheEntry<T> => {
    return {
      value,
      expires: this.now() + this.config.ttl,
    };
  };

  private now = () => {
    return Date.now() / 1000;
  };
}
```

Now consumers can use the `data` property like so

```ts
const cache = new Cache({ data: { hello: 'there' } });
```

And we'll convert that `data` into type `CacheData`

```ts
{
  hello: {
    value: "there",
    expires: 1648392738.447
  }
}
```

We'll have to implement a `trim` function at some point that can iterate over the cache and check for expired items.
For now, however, we'll focus on the core cache methods.

##### <a name="methods"></a>Methods

Lets implement some methods! We at least want to have `get`, `set` and `remove` methods and we want all of them to be type-safe.

Lets start with the `get` method.

```ts
class CustomCache<T extends EmptyObj> {

  ...

  get = (key/*: ?*/)/*: ?*/ => {
    /* ?? */
  };
}
```

What should the type of the `key` argument be? `string` wont suffice here if we want it type-safe. Lets think about constraints again. We want `key` to be constrained to the set of types that contains all valid properties of `T`.

We can achieve it like so

```ts
get = <K extends keyof T>(key: K): T[K] | null => {
  /* ?? */
};
```

Now consumers can only get keys that exists as properties in `T` and we are also able to annotate the correct return type for the function.

What about the implementation? Well, we'd like to achieve a few things:

- If the entry is not found or has expired, return `null`
- If an entry is found but has expired, delete it from the cache
- If an entry is found and has not expired, return the value

```ts
get = <K extends keyof T>(key: K): T[K] | null => {
  const entry = this.data[key];
  if (typeof entry?.value !== 'undefined' && !this.hasExpired(entry)) {
    return entry.value;
  }
  // TODO: remove entry from cache
  return null;
};

private hasExpired = (entry?: CacheEntry<unknown>) => {
  return entry && entry.expires < this.now();
};
```

We'll have to call a `remove` method once we implement it but for now lets try it out!

```ts
// Declare types that describes what we'd like to cache

type Theme = 'dark' | 'light';

type Order = 'asc' | 'desc';

type Post = {
  id: number;
  author: string;
  title: string;
  content: string;
};

type TestCacheData = {
  theme: Theme;
  order: Order;
  posts: Post[];
};

// Initialize cache with declared type
const cache = new CustomCache<TestCacheData>();

// Order | null
const order = cache.get('order');

// Posts[] | null
const posts = cache.get('posts');

// Theme | null
const theme = cache.get('theme');

// TypeScript Error:
// Argument of type '"something"' is not
// assignable to parameter of type 'keyof TestCacheData'.
const something = cache.get('something');
```

Nice! The return type of the `get` call is `inferred` from the `key` argument by looking up the property in `T`, which in this case is of type `CacheData`.

Lets implement the `set` method.
