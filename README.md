# Schweizer Umzüge

Jekyll website draft for Schweizer Umzüge. The implementation follows the project briefing in [`/briefing`](./briefing) while keeping all production assets in the main site structure under [`/assets`](./assets).

## Stack

- Jekyll
- Sass via Jekyll pipeline
- Docker setup aligned with the sample repos

## Local Development

Start the local Jekyll server with Docker:

```bash
docker compose up
```

The site is then available at [http://localhost:4000](http://localhost:4000).

## Project Structure

- [`index.html`](./index.html): Homepage
- [`_pages`](./_pages): Core pages such as services, about, contact, blog, and legal pages
- [`_posts`](./_posts): Blog posts migrated into native Jekyll post files
- [`_data/site.yml`](./_data/site.yml): Main structured site content
- [`assets`](./assets): Images, styles, and JavaScript used by the site

## Notes

- The repository currently runs with `noindex` enabled via [`_config.yml`](./_config.yml) for draft/review use.
- The contact and offer form submits to the configured Formspark endpoint in [`_config.yml`](./_config.yml).
- Source briefing assets are intentionally not referenced directly by the built site. Required assets were copied into production paths under [`/assets`](./assets).
