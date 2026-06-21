---
title: Occlusion Culling - 🚧 Work in progress
date: 2026-06-22
updated:
excerpt: Occlusion Culling is a fundamental geometric process for discarding polygons that are not visible due to other geometry obstructing the visibility from a view vector.
author: jwm
tags: [explainer, 3d, 2d, graphics, mathematics, linear-algebra, geometry, rendering, three-js]
---

## Introduction

[Occlusion culling](https://en.wikipedia.org/wiki/Hidden-surface_determination#Occlusion_culling) is the fundamental operation in which faces of a [geometric mesh](https://en.wikipedia.org/wiki/Types_of_mesh) are discarded if they are being obstructed by other objects and therefore not visible from a viewing direction.