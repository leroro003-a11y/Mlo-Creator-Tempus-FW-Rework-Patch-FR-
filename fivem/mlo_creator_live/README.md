# mlo_creator_live

The live editor of MLO Creator: change a game interior (and the building round it) in the game, on your server, together with MLO Creator.

## Install

1. In MLO Creator, open the project (a *Building of the game*) and press **Install the live editor** in the Export panel: this folder goes into the output folder (your server's `resources`).
2. In `server.cfg`:

   ```
   ensure mlo_creator_live
   add_ace group.admin mlocreator.live allow
   ```

   Only players with the ace `mlocreator.live` can edit; everyone sees the changes.

## Use

1. In MLO Creator press **Send to FiveM**: the project goes into `data/<name>.json` (the panel says the name).
2. In the game: `/mlolive <name>`. The editor starts: fly with the free camera, point the crosshair at an object and click it, then move, turn, copy or delete it, or add a prop (B). **H** shows the keys, **F7** (changeable in the game's key settings) stops and starts the editor again.
3. Every change is saved into `data/<name>.json` and shown to every player at once.
4. In MLO Creator press **Take the changes from FiveM**: they come into the project. Export the resource from there as before for the finished interior.

`/mlolive <name> reload` reads the file again after MLO Creator sent a new version, `/mlolive close` closes the project (its changes stay saved).

## What it does in the game

It is a preview: a game object that was moved or deleted is hidden where it stands (a model hide) and the moved, copied and added ones stand as objects of their own. Changes to the models themselves (openings, faces, textures), new walls, rooms, portals and the collision are made in MLO Creator and come with its export.
