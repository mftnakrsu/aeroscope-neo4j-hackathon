# AeroScope - Landing Page

Single-page static site for the AeroScope hackathon submission. Two files plus this README: `index.html`, `style.css`. No build step, no framework, no external requests.

## Deploy to GitHub Pages

From the repository root:

```bash
# One-time: enable Pages in repo Settings - Pages, source = "Deploy from branch", branch = main, folder = /website
# Then every push to main auto-publishes to https://<user>.github.io/aeroscope-neo4j-hackathon/
git add website/
git commit -m "publish landing page"
git push origin main
```

For a custom domain, add a `CNAME` file inside `website/` with the domain on a single line and point DNS at `<user>.github.io`.

## Deploy to Vercel

```bash
npm i -g vercel
cd website
vercel          # preview
vercel --prod   # production
```

When prompted, set the root directory to `website/` and leave the build command blank - Vercel serves the static files as-is. Subsequent pushes to main auto-deploy.

## Deploy to Netlify

Drag the `website/` folder onto [app.netlify.com/drop](https://app.netlify.com/drop) for a one-off deploy. For continuous deploys, connect the repo in the Netlify UI with publish directory `website/` and an empty build command.
