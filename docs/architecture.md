# Architecture

## Main principle

The website is a bilingual personal knowledge hub and project portfolio.

It should be easy to add:
- new pages;
- new articles;
- new project cards;
- new language-specific content;
- future merch/shop section.

## Tech stack

- Astro
- TypeScript
- MDX later
- Static-first architecture
- Bilingual routing: /ru/ and /en/

## Languages

Supported languages:

- Russian: /ru/
- English: /en/

The root page / is a language selector.

## Components

Reusable components:

- BaseLayout
- Header
- Footer
- LanguageSwitcher
- Container
- PageHeader
- SectionCard
- ProjectCard

## What should stay simple

No database in MVP.
No user accounts.
No checkout.
No custom backend.
No CMS yet.
No over-engineered state management.