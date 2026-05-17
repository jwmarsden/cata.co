---
title: "Hello World"
date: 2026-05-08
excerpt: "This is a first post to both announce the ability to write something, and to build the infrastructure around it, and to also style it."
tags: ["cata", "getting-started"]
author: "jwm"
---

This is a first post to both announce the ability to write something, and to build the infrastructure around it, and to also style it. 

### Goals

1. To get a reasonable place that I can post thoughts and progress. 
2. Learn some [frontend](https://en.wikipedia.org/wiki/Front-end_web_development) and [backend](https://en.wikipedia.org/wiki/Front_end_and_back_end) development.
3. Be slightly more outwardly focused. Eventually put something of value out there?

### Technology

* [Node.js](https://nodejs.org/en) hosted on [Railway.com](http://railway.com/).
* Content built using [Svelte](https://svelte.dev/) using [Typescript](https://www.typescriptlang.org/).
* Generally data is held in [PostgreSQL](https://www.postgresql.org/) with the wonderful [PostGIS](https://postgis.net/) extension. Reading is using [Drizzle](https://orm.drizzle.team/)
* These posts are raw [Markdown](https://en.wikipedia.org/wiki/Markdown) as it feeds into my [Obsidian](https://obsidian.md/) obsession. I am reading these into [Svelte](https://svelte.dev/) with [Marked](https://marked.js.org/) and [Grey Matter](https://www.npmjs.com/package/gray-matter#gray-matter----).
* Maps thus far are using [MapLibre](https://maplibre.org/).

Majority of this is new to me. 

### Cata.co?

I purchased [cata.co](https://cata.co) many years ago when there was an explosion of nameservers that people were playing with. My thoughts at the time was to create a page called "Catacombs" or "cata.co/mbs". Of course, I never did this but I still really like the shortness and punch of the two syllables Ca-Ta.

---

### Can this?

#### Image

![Windmill in Tylewice, Poland](/images/tylewice-wiatrak-windmill-abri-2013.jpg)

#### Code block

```
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
```

what about highlight?

```typescript
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
```
