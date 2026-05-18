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

#### Foot-notes

[^1]: This is a footnote content.

Here is a simple footnote[^1]. With some additional text after it[^@#$%] and without disrupting the blocks[^bignote].

[^bignote]: The first paragraph of the definition.

    Paragraph two of the definition.

    > A blockquote with
    > multiple lines.

    ```
    a code block
    ```
    
    | Name       | Country   | Check-ins |
    |------------|-----------|-----------|
    | Adelaide   | Australia | 12        |
    | London     | UK        | 8         |
    | Tokyo      | Japan     | 5         |

    A `final` paragraph before list.

    - Item 1
    - Item 2
      - Subitem 1
      - Subitem 2

[^@#$%]: A footnote on the label: "@#$%".

#### Image

![Windmill in Tylewice, Poland|200](/images/tylewice-wiatrak-windmill-abri-2013.jpg)
![Windmill in Tylewice, Poland|1000x800](/images/tylewice-wiatrak-windmill-abri-2013.jpg)
![Windmill in Tylewice, Poland](/images/tylewice-wiatrak-windmill-abri-2013.jpg)

#### Code block

##### TypeScript

```ts
interface User {
    name: string;
    age: number;
}

async function getUser(id: number): Promise {
    const res = await fetch(`/api/users/${id}`);
    return res.json();
}
```

##### Python

```python
def fibonacci(n: int) -> list[int]:
    sequence = [0, 1]
    for i in range(2, n):
        sequence.append(sequence[i-1] + sequence[i-2])
    return sequence
```

##### SQL

```sql
SELECT city, COUNT(*) as checkins
FROM check_ins
GROUP BY city
ORDER BY checkins DESC;
```

#### Math?

##### Inline math

The quadratic formula is $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$ which gives the roots.

##### Block math

$$
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$

##### Another block

$$
E = mc^2
$$