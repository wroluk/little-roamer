# Postcard captures

`mars-photo-views.json` preserves ten photo-mode views supplied for Mars, and
`northern-reach-photo-views.json` preserves seventeen Northern Reach views,
including Pine Hollows and the hidden stone circle. Each entry keeps the copied car pose and camera values. The capture
script uses the camera position, target, and field of view for car-free images;
the car pose remains as a reference to the original photo-mode session.

With the local development server running, regenerate the images with:

```sh
POSTCARD_BASE_URL=http://127.0.0.1:5173 node --import tsx artifacts/postcards/capture.mjs
```

The script writes images to `public/postcards/mars/` and
`public/postcards/northern-reach/`. Set `POSTCARD_AREA=northern-reach` or
`POSTCARD_AREA=mars` to capture one location, or pass postcard IDs as arguments
to capture selected entries. Saved views must cover every authored postcard.
