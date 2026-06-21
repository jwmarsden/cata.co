---
title: "June Update"
date: 2026-06-21
excerpt: "'An hour of planning can save you 10 hours of doing.' – Dale Carnegie." 
tags: ["ramble","articles","multibuild"]
author: "jwm"
---

## Ramble

Mid journey to the destination the wisp stopped to pry. A little wonder and a ponder of why even bother to continue to fly. Something in the distance, it continued to roam. "Is it more appropriate to sit? what'about backwards or even just spin?". If the wisp had shoulders, it would shrug them but unfortunately all it could do is take stock, reflect and begin. 

Motivation remains an enigma, from whence does it blaze, will it continue? can I bottle it? or will it just slowly wane? 

## First Article

The [first article on back-face culling](/articls/backface-culling) is completed. 

![Back-face Culling example on Stanford Bunny](/images/article-back-face-cull.png)

I completely understand that the topic here is not novel, the theory and implementation is not overly complex and it wont be very useful to anyone who is interested in the domain. Moreover, the graphics pipelines for [Vulkan](https://www.vulkan.org/) have evolved significantly from methods that require this approach. It is more efficient to store whole geometries in GPU memory and figure out what is in the viewport using parallel GPU shaders. However, I wanted to start somewhere and given my own personal constraints I need to pick my battlefronts. 

While the article might seem simple, I have had to,

1. Build the article functionality into my [cata.co](/) code base. This includes;
    - The main article page including formatting (which was reused from my posts) and the table of contents creation and linking (I like this about other articles I read on the internet).
    - The list page which is a basic stub.
    - Add the tags from articles to the main site structure pushing them to Redis for the main tag-list. 
    - Skeletons for the admin section for articles.
1. Build the [three.js](https://threejs.org/) scene functionality including;
    - Figure out how to host the scene javascript in my bucket and serve it to the page with a formatting tag.
    - Figure out how to host a base library of functions so my scene files don't explode with similar functionality.
    - Figure out how to import libraries and display them in a functional window within the article.
    - Restructure the SvelteKit deployment to serve the scenes in their own basic layout so they can be included on a page nicely. 
    - Admin sections to edit and view the scene while developing. 
1. Authour and edit the [back-face culling article](/articls/backface-culling). This includes;
    - The ramble at the start of the article.
    - Document the formalisation section. 
    - Implement the view and culling scenes using my scene framework which included numerous refactors learning [three.js](https://threejs.org/) and shaping the examples how I want them. 
    - Edit the components into a coherent flow.
    - Control myself from [scope-creep](https://en.wikipedia.org/wiki/Scope_creep). 

Even though the article itself is not an overly useful contribution, I am happy with my deeper personal progress and commitment. 

## Multibuild

My [MultiBuild](https://multibuild.io/) printing is progressing well and to achieve this I have been printing back to back throughout the month so far. I will post some pictures soon of the progress. 

There is always more to do. 