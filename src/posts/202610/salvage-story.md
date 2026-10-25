---
title: "Salvage Story"
date: 2026-10-24
excerpt: "'I see no reason for the existence of the universe in a teleological sense; there is surely no final cause or purpose. Rather, I think that meaning is an emergent property; it appeared on Earth when the brains of our ancestors became large enough to allow for primitive culture...' – Brian Cox" 
tags: ["ramble","emergence","update","salvage","nixos","ai","claude","obsidian"]
author: "jwm"
---

## Ramble

Kayn the cartographer had an obsession,\
and the obsession was building a catalogue.\
It started out as a simple line,\
then grew into a full analogue.

Built, and built upon, and built again,\
it quickly leapt along:\
a road, a bridge, a boundary wall,\
each one where it belonged.

The catalogue grew so deep in detail,\
so complete, line by line,\
it covered all the land it charted\
and took its place in time.

Now nomads roam its paper paths,\
but they never think a doubt;\
the world it emerged from lies under,\
and no one's found it out.

## Update

Sick. Everyone. Weeks and weeks. 

</rant>

We now have an [Occlusion Cull article](/articles/graphics/occlusion-culling).

![[image:b845bef0-afc3-48b5-b9e1-a7ca8b37ca68]] {Example dragon model, with occlusion cull}

This now allows me to move onto the next step of the article flow.

## Salvage Details

I am finally reusing Salvage. Salvage is a [12" MacBook](https://en.wikipedia.org/wiki/MacBook_(12-inch)) from 2017: fanless, a 4.5 watt Core i5 and 8 GB of memory. Apple stopped updating macOS a few versions ago, so it now runs [NixOS](https://nixos.org/) with the [Sway](https://swaywm.org/) tiling window manager. I was trying to use X based distro's up until now and I have always been unhappy with the result. [NixOS](https://nixos.org/) is awesome and [Claude Code](https://www.anthropic.com/claude-code) has been amazing at working through the hardware problems. It is at the point that its the nicest linux configuration I have ever used. 

![[image:858e82cd-ea08-430f-8bae-4b3b82fac0bd]] {Salvage Desktop 202610}

The whole machine is one declarative configuration in a public repo, [jwmarsden/Salvage](https://github.com/jwmarsden/Salvage), with a [README](https://github.com/jwmarsden/Salvage#salvage) covering what it is and what is on it. 

The coolest bits are the hardware fixes, since Linux on this model is not meant to be easy:

1. **Speakers.** The Cirrus Logic codec is silent on a stock kernel. A patched driver from [macbook12-audio-driver](https://github.com/leifliddy/macbook12-audio-driver) gets sound out, and an Apple EFI variable keeps the startup chime quiet. Written up in the [audio fix](https://github.com/jwmarsden/Salvage/blob/main/macbook-audio-fix.md).
1. **Camera.** The FaceTime HD camera needs firmware cut out of Apple's Boot Camp package and a patch to the [facetimehd](https://github.com/patjak/facetimehd) driver, thanks to [macbook10-1-facetimehd-linux](https://github.com/neron82/macbook10-1-facetimehd-linux). It is all in [one Nix file](https://github.com/jwmarsden/Salvage/blob/main/nix/facetimehd-macbook10.nix).
1. **Suspend.** Closing the lid used to hang the NVMe drive, and deep sleep killed the speakers. Now the drive stays out of D3cold and the machine uses s2idle, so it wakes up with sound. See the [suspend fix](https://github.com/jwmarsden/Salvage/blob/main/macbook-suspend-fix.md).
1. **The flashing folder.** For a while it booted to a flashing question-mark folder thanks to stale Apple startup-disk NVRAM. An NVRAM reset, then putting the silent boot back, sorted it. See the [boot fix](https://github.com/jwmarsden/Salvage/blob/main/macbook-boot-fix.md).
1. **Small comforts.** The power button now asks before shutting down, as I kept hitting it by accident, and everything wears [Tokyo Night](https://github.com/folke/tokyonight.nvim).

It is also my development machine now: Node, Postgres with PostGIS and Redis in Docker, which is how the [Occlusion Culling](/articles/graphics/occlusion-culling) article above got written.

## Media, finally

A little while ago I uplifited the image posting on [cata.co](/). Images on this site have been a manual affair. I had an admin media library that could upload to the bucket and hold metadata, but nothing that let me actually *use* an image in a post without hand-writing a URL that only worked if you happened to be logged in as me.

Now I have a directive that I can use in my posts and articles,

```
![[image:MEDIA_ID]] {an optional caption}
```

which does bit more than it looks like it does:

1. On upload, the image now gets resized into two derived variants — one at 1200px for the body of the post, one at 2000px for the full view — alongside the existing thumbnail. The original dimensions get recorded so the browser can reserve the right space before the image arrives.
1. Two new endpoints serve those variants publicly, with a long cache header. Previously *every* read path through the media library required a session, which is fine for an admin grid and useless for a public article.
1. Anything already in the library is handled lazily. The first time an old image is referenced, the variants are generated and cached on the way past, so I did not need a batch migration over the existing files.
1. Clicking an image opens a lightbox, and every embedded image on the page joins one gallery automatically, in document order. Arrow keys and prev/next step through them.

The bucket is shared between my local environment and production, which means an image uploaded on the live site is immediately usable from my laptop. The database is not shared, so there is a small script to pull the media rows across.

## Take Note

Because I am so busy in all dimensions of my life, I have kicked my note taking in Obsidian back into gear.

My vault is laid out as a mix of [PARA](https://fortelabs.com/blog/para/) and a [Zettelkasten](https://zettelkasten.de/introduction/) but they continue to evolve even tho I have been working in there for a couple of years. 

My notes and this site are plain Markdown, as I said in [Hello World](/posts/202605/hello-world) and they move between the vault and the site without any conversion. 

🐟